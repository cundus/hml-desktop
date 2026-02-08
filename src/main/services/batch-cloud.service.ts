import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'
import { AuditLogService } from './audit-log.service'

export interface Batch {
  id: string
  productId: string
  code: string
  expiryDate: Date | null
  cost: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreateBatchDto {
  productId: string
  code: string
  expiryDate?: Date
  cost?: string
}

export interface UpdateBatchDto {
  code: string
  expiryDate?: Date
}

export class BatchCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'batch'
  private auditLogService?: AuditLogService

  constructor(localDb: Database, queueService: QueueService, auditLogService?: AuditLogService) {
    this.localDb = localDb
    this.queueService = queueService
    this.auditLogService = auditLogService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Batch[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM batch WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[BatchCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Batch[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM batch WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Batch | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[BatchCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Batch | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const b = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return b
    }
    stmt.free()
    return undefined
  }

  async findByCode(code: string): Promise<Batch | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM batch WHERE code = $1 AND deleted_at IS NULL',
          [code]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[BatchCloud] findByCode error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    if (stmt.step()) {
      const b = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return b
    }
    stmt.free()
    return undefined
  }

  async findByProductId(productId: string): Promise<Batch[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM batch WHERE product_id = $1 AND deleted_at IS NULL ORDER BY expiry_date ASC',
          [productId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[BatchCloud] findByProductId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM batch WHERE product_id = ? AND deleted_at IS NULL ORDER BY expiry_date ASC'
    )
    stmt.bind([productId])
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findExpiring(days: number): Promise<Batch[]> {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM batch WHERE expiry_date IS NOT NULL AND expiry_date <= $1 AND deleted_at IS NULL ORDER BY expiry_date ASC',
          [futureDate]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[BatchCloud] findExpiring error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM batch WHERE expiry_date IS NOT NULL AND expiry_date <= ? AND deleted_at IS NULL ORDER BY expiry_date ASC'
    )
    stmt.bind([futureDate.getTime()])
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async create(data: CreateBatchDto): Promise<Batch> {
    const id = randomUUID()
    const now = new Date()
    const batch: Batch = {
      id,
      productId: data.productId,
      code: data.code,
      expiryDate: data.expiryDate ?? null,
      cost: data.cost ?? '0',
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO batch (id, product_id, code, expiry_date, cost, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, data.productId, data.code, data.expiryDate ?? null, batch.cost, now, now]
        )
        return batch
      } catch (error) {
        console.error('[BatchCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO batch (id, product_id, code, expiry_date, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.code,
        data.expiryDate?.getTime() ?? null,
        batch.cost,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      product_id: data.productId,
      code: data.code,
      expiry_date: data.expiryDate?.toISOString() ?? null,
      cost: batch.cost,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })

    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'CREATE',
        entityType: 'batch',
        entityId: id,
        userId: 'SYSTEM',
        storeId: undefined, // Batch is global or store specific? Schema has no store_id.
        newValues: { code: data.code, productId: data.productId, cost: batch.cost, expiryDate: batch.expiryDate },
        metadata: { type: 'batch' }
      })
    }
    return batch
  }

  async update(id: string, data: UpdateBatchDto): Promise<Batch> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Batch not found')
    const now = new Date()
    const updated: Batch = {
      ...existing,
      code: data.code,
      expiryDate: data.expiryDate ?? existing.expiryDate,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE batch SET code = $1, expiry_date = $2, updated_at = $3 WHERE id = $4',
          [updated.code, updated.expiryDate, now, id]
        )
        return updated
      } catch (error) {
        console.error('[BatchCloud] update error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE batch SET code = ?, expiry_date = ?, updated_at = ? WHERE id = ?', [
      updated.code,
      updated.expiryDate?.getTime() ?? null,
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      code: updated.code,
      expiry_date: updated.expiryDate?.toISOString() ?? null,
      updated_at: now.toISOString()
    })

    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'UPDATE',
        entityType: 'batch',
        entityId: id,
        userId: 'SYSTEM',
        storeId: undefined,
        newValues: { code: updated.code, expiryDate: updated.expiryDate },
        oldValues: { code: existing.code, expiryDate: existing.expiryDate },
        metadata: { type: 'batch' }
      })
    }
    return updated
  }

  async softDelete(id: string): Promise<Batch> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Batch not found')
    const now = new Date()
    const deleted: Batch = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE batch SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
          now,
          now,
          id
        ])
        return deleted
      } catch (error) {
        console.error('[BatchCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE batch SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', this.tableName, { id })
    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'DELETE',
        entityType: 'batch',
        entityId: id,
        userId: 'SYSTEM',
        storeId: undefined,
        metadata: { type: 'batch' }
      })
    }
    return deleted
  }

  private mapCloudRow(row: Record<string, unknown>): Batch {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      code: row.code as string,
      expiryDate: row.expiry_date ? new Date(row.expiry_date as string) : null,
      cost: (row.cost as string) || '0',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Batch {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      code: row.code as string,
      expiryDate: row.expiry_date ? new Date(row.expiry_date as number) : null,
      cost: (row.cost as string) || '0',
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }

  /**
   * Allocate stock from batches based on FIFO (First-Expired, First-Out)
   * Returns list of { batch_id, quantity } to be deducted.
   */
  async allocateStock(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<{ batch_id: string; quantity: number }[]> {
    if (quantity <= 0) return []

    // 1. Fetch available batches with their current quantity
    // Cloud Logic
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const query = `
          SELECT 
            st.batch_id, 
            SUM(CASE WHEN st.type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN') THEN st.quantity 
                     WHEN st.type IN ('OUTBOUND', 'TRANSFER_OUT', 'ADJUSTMENT', 'SALE', 'WASTE') THEN -st.quantity 
                     ELSE 0 END) as current_qty,
            b.expiry_date,
            b.created_at
          FROM stock_transaction st
          LEFT JOIN batch b ON st.batch_id = b.id
          WHERE st.product_id = $1 
            AND st.store_id = $2
            AND st.deleted_at IS NULL
            AND st.batch_id IS NOT NULL
          GROUP BY st.batch_id, b.expiry_date, b.created_at
          HAVING SUM(CASE WHEN st.type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN') THEN st.quantity 
                          WHEN st.type IN ('OUTBOUND', 'TRANSFER_OUT', 'ADJUSTMENT', 'SALE', 'WASTE') THEN -st.quantity 
                          ELSE 0 END) > 0
          ORDER BY b.expiry_date ASC NULLS LAST, b.created_at ASC
        `
        const result = await pool.query(query, [productId, storeId])

        return this.calculateAllocation(result.rows, quantity)
      } catch (error) {
        console.error('[BatchCloud] allocateStock error, falling back to local:', error)
      }
    }

    // Local Logic (Sql.js)
    const stmt = this.localDb.prepare(`
      SELECT 
        st.batch_id, 
        st.type,
        st.quantity,
        b.expiry_date,
        b.created_at
      FROM stock_transaction st
      LEFT JOIN batch b ON st.batch_id = b.id
      WHERE st.product_id = ? 
        AND st.store_id = ?
        AND st.deleted_at IS NULL
        AND st.batch_id IS NOT NULL
    `)
    stmt.bind([productId, storeId])

    const batchStockMap = new Map<string, { qty: number; expiry: number; created: number }>()

    while (stmt.step()) {
      const row = stmt.getAsObject()
      const batchId = row.batch_id as string
      const type = row.type as string
      const qty = row.quantity as number
      const expiry = row.expiry_date
        ? new Date(row.expiry_date as number | string).getTime()
        : Number.MAX_SAFE_INTEGER
      const created = row.created_at ? new Date(row.created_at as number | string).getTime() : 0

      if (!batchStockMap.has(batchId)) {
        batchStockMap.set(batchId, { qty: 0, expiry, created })
      }

      const current = batchStockMap.get(batchId)!

      const inboundTypes = ['INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN']
      const outboundTypes = ['OUTBOUND', 'TRANSFER_OUT', 'ADJUSTMENT', 'SALE', 'WASTE']

      if (inboundTypes.includes(type)) {
        current.qty += qty
      } else if (outboundTypes.includes(type)) {
        current.qty -= qty
      }
    }
    stmt.free()

    const availableBatches = Array.from(batchStockMap.entries())
      .filter(([_, data]) => data.qty > 0)
      .map(([id, data]) => ({
        batch_id: id,
        current_qty: data.qty,
        expiry_date: data.expiry,
        created_at: data.created
      }))
      .sort((a, b) => {
        if (a.expiry_date !== b.expiry_date) return a.expiry_date - b.expiry_date
        return a.created_at - b.created_at
      })

    return this.calculateAllocation(availableBatches, quantity)
  }

  private calculateAllocation(
    availableBatches: { batch_id: string; current_qty: number }[],
    requestedQty: number
  ): { batch_id: string; quantity: number }[] {
    const allocations: { batch_id: string; quantity: number }[] = []
    let remaining = requestedQty

    for (const batch of availableBatches) {
      if (remaining <= 0) break
      const take = Math.min(remaining, batch.current_qty)
      allocations.push({ batch_id: batch.batch_id, quantity: take })
      remaining -= take
    }

    return allocations
  }
}
