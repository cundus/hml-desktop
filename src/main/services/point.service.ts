import { Database } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface PointSetting {
  id: string
  pointPerRupiah: string
  minTransaction: string
  redemptionValue: string
  minRedemption: number
  maxRedemptionPercent: number
  expiryMonths: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PointHistory {
  id: string
  customerId: string
  transactionId: string | null
  type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST'
  points: number
  balanceAfter: number
  notes: string | null
  expiresAt: Date | null
  createdAt: Date
}

const DEFAULT_SETTING_ID = 'default'

/**
 * PointCloudService - Cloud-first member points service
 *
 * Pattern:
 * - Online: Direct PostgreSQL operations
 * - Offline: Queue operations for later replay
 */
export class PointCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  // ==================== SETTINGS ====================

  async getSettings(): Promise<PointSetting | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM point_setting WHERE id = $1 AND deleted_at IS NULL',
          [DEFAULT_SETTING_ID]
        )
        if (result.rows.length > 0) {
          return this.mapCloudRowToSetting(result.rows[0])
        }
      } catch (error) {
        console.error('[PointCloud] getSettings cloud error:', error)
      }
    }
    return this.getSettingsLocal()
  }

  private getSettingsLocal(): PointSetting | null {
    const result = this.localDb.exec(
      `SELECT * FROM point_setting WHERE id = '${DEFAULT_SETTING_ID}' AND deleted_at IS NULL LIMIT 1`
    )
    if (!result.length || !result[0].values.length) return null
    return this.mapLocalRowToSetting(result[0])
  }

  async updateSettings(
    data: Partial<Omit<PointSetting, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PointSetting> {
    const now = new Date()
    const existing = await this.getSettings()

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        if (!existing) {
          await pool.query(
            `INSERT INTO point_setting (id, point_per_rupiah, min_transaction, redemption_value, 
             min_redemption, max_redemption_percent, expiry_months, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              DEFAULT_SETTING_ID,
              data.pointPerRupiah ?? '0.01',
              data.minTransaction ?? '0',
              data.redemptionValue ?? '10',
              data.minRedemption ?? 100,
              data.maxRedemptionPercent ?? 50,
              data.expiryMonths ?? 12,
              data.isActive ?? true,
              now,
              now
            ]
          )
        } else {
          const updates: string[] = []
          const values: (string | number | boolean | Date)[] = []
          let idx = 1

          if (data.pointPerRupiah !== undefined) {
            updates.push(`point_per_rupiah = $${idx++}`)
            values.push(data.pointPerRupiah)
          }
          if (data.minTransaction !== undefined) {
            updates.push(`min_transaction = $${idx++}`)
            values.push(data.minTransaction)
          }
          if (data.redemptionValue !== undefined) {
            updates.push(`redemption_value = $${idx++}`)
            values.push(data.redemptionValue)
          }
          if (data.minRedemption !== undefined) {
            updates.push(`min_redemption = $${idx++}`)
            values.push(data.minRedemption)
          }
          if (data.maxRedemptionPercent !== undefined) {
            updates.push(`max_redemption_percent = $${idx++}`)
            values.push(data.maxRedemptionPercent)
          }
          if (data.expiryMonths !== undefined) {
            updates.push(`expiry_months = $${idx++}`)
            values.push(data.expiryMonths)
          }
          if (data.isActive !== undefined) {
            updates.push(`is_active = $${idx++}`)
            values.push(data.isActive)
          }
          updates.push(`updated_at = $${idx++}`)
          values.push(now)
          values.push(DEFAULT_SETTING_ID)

          await pool.query(
            `UPDATE point_setting SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
          )
        }
        console.log('[PointCloud] Settings updated in cloud')
        return (await this.getSettings())!
      } catch (error) {
        console.error('[PointCloud] updateSettings cloud error, saving locally:', error)
      }
    }

    // Offline or error: save to local + queue
    this.updateSettingsLocal(data, now, existing)
    await this.queueService.add('UPDATE', 'point_setting', {
      id: DEFAULT_SETTING_ID,
      ...data,
      updated_at: now.toISOString()
    })
    return (await this.getSettings())!
  }

  private updateSettingsLocal(
    data: Partial<Omit<PointSetting, 'id' | 'createdAt' | 'updatedAt'>>,
    now: Date,
    existing: PointSetting | null
  ): void {
    const nowTs = now.getTime()
    if (!existing) {
      this.localDb.run(`
        INSERT INTO point_setting (id, point_per_rupiah, min_transaction, redemption_value,
          min_redemption, max_redemption_percent, expiry_months, is_active, created_at, updated_at)
        VALUES ('${DEFAULT_SETTING_ID}', '${data.pointPerRupiah ?? '0.01'}', '${data.minTransaction ?? '0'}',
          '${data.redemptionValue ?? '10'}', ${data.minRedemption ?? 100}, ${data.maxRedemptionPercent ?? 50},
          ${data.expiryMonths ?? 12}, ${(data.isActive ?? true) ? 1 : 0}, ${nowTs}, ${nowTs})
      `)
    } else {
      const updates: string[] = []
      if (data.pointPerRupiah !== undefined)
        updates.push(`point_per_rupiah = '${data.pointPerRupiah}'`)
      if (data.minTransaction !== undefined)
        updates.push(`min_transaction = '${data.minTransaction}'`)
      if (data.redemptionValue !== undefined)
        updates.push(`redemption_value = '${data.redemptionValue}'`)
      if (data.minRedemption !== undefined) updates.push(`min_redemption = ${data.minRedemption}`)
      if (data.maxRedemptionPercent !== undefined)
        updates.push(`max_redemption_percent = ${data.maxRedemptionPercent}`)
      if (data.expiryMonths !== undefined) updates.push(`expiry_months = ${data.expiryMonths}`)
      if (data.isActive !== undefined) updates.push(`is_active = ${data.isActive ? 1 : 0}`)
      updates.push(`updated_at = ${nowTs}`)

      this.localDb.run(
        `UPDATE point_setting SET ${updates.join(', ')} WHERE id = '${DEFAULT_SETTING_ID}'`
      )
    }
    saveDb(this.localDb)
  }

  // ==================== POINTS CALCULATION ====================

  async calculateEarnedPoints(transactionTotal: number): Promise<number> {
    const settings = await this.getSettings()
    if (!settings || !settings.isActive) return 0
    if (transactionTotal < Number(settings.minTransaction)) return 0
    return Math.floor(transactionTotal * Number(settings.pointPerRupiah))
  }

  async calculateRedemptionDiscount(points: number, transactionTotal: number): Promise<number> {
    const settings = await this.getSettings()
    if (!settings || !settings.isActive) return 0
    if (points < settings.minRedemption) return 0

    const maxDiscount = (transactionTotal * settings.maxRedemptionPercent) / 100
    const pointValue = points * Number(settings.redemptionValue)
    return Math.min(pointValue, maxDiscount)
  }

  // ==================== CUSTOMER POINTS ====================

  async getCustomerPoints(customerId: string): Promise<number> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT total_points FROM customer WHERE id = $1 AND deleted_at IS NULL',
          [customerId]
        )
        if (result.rows.length > 0) {
          return result.rows[0].total_points || 0
        }
      } catch (error) {
        console.error('[PointCloud] getCustomerPoints cloud error:', error)
      }
    }
    return this.getCustomerPointsLocal(customerId)
  }

  private getCustomerPointsLocal(customerId: string): number {
    const result = this.localDb.exec(
      `SELECT total_points FROM customer WHERE id = '${customerId}' AND deleted_at IS NULL`
    )
    if (!result.length || !result[0].values.length) return 0
    return (result[0].values[0][0] as number) || 0
  }

  async addPoints(input: {
    customerId: string
    transactionId: string
    transactionTotal: number
  }): Promise<PointHistory | null> {
    const points = await this.calculateEarnedPoints(input.transactionTotal)
    if (points <= 0) return null

    const currentBalance = await this.getCustomerPoints(input.customerId)
    const newBalance = currentBalance + points
    const now = new Date()
    const historyId = uuidv4()

    const settings = await this.getSettings()
    let expiresAt: Date | null = null
    if (settings && settings.expiryMonths > 0) {
      expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + settings.expiryMonths)
    }

    const history: PointHistory = {
      id: historyId,
      customerId: input.customerId,
      transactionId: input.transactionId,
      type: 'EARN',
      points,
      balanceAfter: newBalance,
      notes: `Bonus dari transaksi ${input.transactionId}`,
      expiresAt,
      createdAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE customer SET total_points = $1, updated_at = $2 WHERE id = $3', [
          newBalance,
          now,
          input.customerId
        ])
        await pool.query(
          `INSERT INTO point_history (id, customer_id, transaction_id, type, points, balance_after, notes, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            historyId,
            input.customerId,
            input.transactionId,
            'EARN',
            points,
            newBalance,
            history.notes,
            expiresAt,
            now,
            now
          ]
        )
        console.log('[PointCloud] Points added in cloud:', points)
        return history
      } catch (error) {
        console.error('[PointCloud] addPoints cloud error, queuing:', error)
      }
    }

    // Offline: save to local + queue
    this.addPointsLocal(input.customerId, newBalance, history, now)
    await this.queueService.add('UPDATE', 'customer', {
      id: input.customerId,
      total_points: newBalance,
      updated_at: now.toISOString()
    })
    await this.queueService.add('INSERT', 'point_history', {
      id: historyId,
      customer_id: input.customerId,
      transaction_id: input.transactionId,
      type: 'EARN',
      points,
      balance_after: newBalance,
      notes: history.notes,
      expires_at: expiresAt?.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return history
  }

  private addPointsLocal(
    customerId: string,
    newBalance: number,
    history: PointHistory,
    now: Date
  ): void {
    const nowTs = now.getTime()
    this.localDb.run(
      `UPDATE customer SET total_points = ${newBalance}, updated_at = ${nowTs} WHERE id = '${customerId}'`
    )
    this.localDb.run(
      `INSERT INTO point_history (id, customer_id, transaction_id, type, points, balance_after, notes, expires_at, created_at, updated_at)
       VALUES ('${history.id}', '${customerId}', '${history.transactionId}', 'EARN', ${history.points}, ${newBalance}, 
       '${history.notes}', ${history.expiresAt ? history.expiresAt.getTime() : 'NULL'}, ${nowTs}, ${nowTs})`
    )
    saveDb(this.localDb)
  }

  async redeemPoints(input: {
    customerId: string
    transactionId: string
    points: number
  }): Promise<{ discount: number; history: PointHistory } | null> {
    const settings = await this.getSettings()
    if (!settings || !settings.isActive) return null

    const currentBalance = await this.getCustomerPoints(input.customerId)
    if (currentBalance < input.points) return null
    if (input.points < settings.minRedemption) return null

    const discount = input.points * Number(settings.redemptionValue)
    const newBalance = currentBalance - input.points
    const now = new Date()
    const historyId = uuidv4()

    const history: PointHistory = {
      id: historyId,
      customerId: input.customerId,
      transactionId: input.transactionId,
      type: 'REDEEM',
      points: -input.points,
      balanceAfter: newBalance,
      notes: `Penukaran untuk diskon Rp${discount}`,
      expiresAt: null,
      createdAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE customer SET total_points = $1, updated_at = $2 WHERE id = $3', [
          newBalance,
          now,
          input.customerId
        ])
        await pool.query(
          `INSERT INTO point_history (id, customer_id, transaction_id, type, points, balance_after, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            historyId,
            input.customerId,
            input.transactionId,
            'REDEEM',
            -input.points,
            newBalance,
            history.notes,
            now,
            now
          ]
        )
        console.log('[PointCloud] Points redeemed in cloud:', input.points)
        return { discount, history }
      } catch (error) {
        console.error('[PointCloud] redeemPoints cloud error, queuing:', error)
      }
    }

    // Offline
    this.redeemPointsLocal(input.customerId, newBalance, history, now)
    await this.queueService.add('UPDATE', 'customer', {
      id: input.customerId,
      total_points: newBalance,
      updated_at: now.toISOString()
    })
    await this.queueService.add('INSERT', 'point_history', {
      id: historyId,
      customer_id: input.customerId,
      transaction_id: input.transactionId,
      type: 'REDEEM',
      points: -input.points,
      balance_after: newBalance,
      notes: history.notes,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return { discount, history }
  }

  private redeemPointsLocal(
    customerId: string,
    newBalance: number,
    history: PointHistory,
    now: Date
  ): void {
    const nowTs = now.getTime()
    this.localDb.run(
      `UPDATE customer SET total_points = ${newBalance}, updated_at = ${nowTs} WHERE id = '${customerId}'`
    )
    this.localDb.run(
      `INSERT INTO point_history (id, customer_id, transaction_id, type, points, balance_after, notes, created_at, updated_at)
       VALUES ('${history.id}', '${customerId}', '${history.transactionId}', 'REDEEM', ${history.points}, ${newBalance}, 
       '${history.notes}', ${nowTs}, ${nowTs})`
    )
    saveDb(this.localDb)
  }

  // ==================== HISTORY ====================

  async getHistory(customerId: string, limit = 50): Promise<PointHistory[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT * FROM point_history WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2`,
          [customerId, limit]
        )
        return result.rows.map((row) => this.mapCloudRowToHistory(row))
      } catch (error) {
        console.error('[PointCloud] getHistory cloud error:', error)
      }
    }
    return this.getHistoryLocal(customerId, limit)
  }

  private getHistoryLocal(customerId: string, limit: number): PointHistory[] {
    const result = this.localDb.exec(
      `SELECT * FROM point_history WHERE customer_id = '${customerId}' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ${limit}`
    )
    if (!result.length) return []
    return result[0].values.map((row) => ({
      id: row[0] as string,
      customerId: row[1] as string,
      transactionId: row[2] as string | null,
      type: row[3] as 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST',
      points: row[4] as number,
      balanceAfter: row[5] as number,
      notes: row[6] as string | null,
      expiresAt: row[7] ? new Date(row[7] as number) : null,
      createdAt: new Date(row[8] as number)
    }))
  }

  // ==================== MAPPERS ====================

  private mapCloudRowToSetting(row: Record<string, unknown>): PointSetting {
    return {
      id: row.id as string,
      pointPerRupiah: row.point_per_rupiah as string,
      minTransaction: row.min_transaction as string,
      redemptionValue: row.redemption_value as string,
      minRedemption: row.min_redemption as number,
      maxRedemptionPercent: row.max_redemption_percent as number,
      expiryMonths: row.expiry_months as number,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    }
  }

  private mapLocalRowToSetting(result: { columns: string[]; values: unknown[][] }): PointSetting {
    const cols = result.columns
    const row = result.values[0]
    const get = (name: string): unknown => row[cols.indexOf(name)]

    return {
      id: get('id') as string,
      pointPerRupiah: get('point_per_rupiah') as string,
      minTransaction: get('min_transaction') as string,
      redemptionValue: get('redemption_value') as string,
      minRedemption: get('min_redemption') as number,
      maxRedemptionPercent: get('max_redemption_percent') as number,
      expiryMonths: get('expiry_months') as number,
      isActive: Boolean(get('is_active')),
      createdAt: new Date(get('created_at') as number),
      updatedAt: new Date(get('updated_at') as number)
    }
  }

  private mapCloudRowToHistory(row: Record<string, unknown>): PointHistory {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      transactionId: row.transaction_id as string | null,
      type: row.type as 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST',
      points: row.points as number,
      balanceAfter: row.balance_after as number,
      notes: row.notes as string | null,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      createdAt: new Date(row.created_at as string)
    }
  }
}
