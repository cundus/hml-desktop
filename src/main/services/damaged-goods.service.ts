/* eslint-disable @typescript-eslint/no-explicit-any */
import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { QueueService } from './queue.service'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'

export interface DamagedGood {
  id: string
  productId: string
  storeId: string
  uomId: string
  quantity: number
  cost: string
  totalLoss: string
  reason: string
  notes: string | null
  performedBy: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
  // Joined fields
  productName?: string
  productSku?: string
  storeName?: string
  uomCode?: string
}

export interface CreateDamagedGoodDto {
  productId: string
  storeId: string
  uomId: string
  quantity: number
  cost: string
  reason: string
  notes?: string
  performedBy: string
}

export class DamagedGoodsService {
  constructor(
    private db: Database,
    private queueService?: QueueService
  ) {}

  /**
   * Create a new damaged goods record
   */
  async create(data: CreateDamagedGoodDto): Promise<DamagedGood> {
    const id = randomUUID()
    const now = Date.now()
    const totalLoss = (parseFloat(data.cost) * data.quantity).toString()

    this.db.run(
      `INSERT INTO damaged_goods 
        (id, product_id, store_id, uom_id, quantity, cost, total_loss, reason, notes, performed_by, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.productId,
        data.storeId,
        data.uomId,
        data.quantity,
        data.cost,
        totalLoss,
        data.reason,
        data.notes ?? null,
        data.performedBy,
        now,
        now
      ]
    )

    // Sync to Cloud (Queue & Direct)
    const cloudPayload = {
      id,
      product_id: data.productId,
      store_id: data.storeId,
      uom_id: data.uomId,
      quantity: data.quantity,
      cost: data.cost,
      total_loss: totalLoss,
      reason: data.reason,
      notes: data.notes ?? null,
      performed_by: data.performedBy,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString()
    }

    // 1. Queue for background sync
    if (this.queueService) {
      await this.queueService.add('INSERT', 'damaged_goods', cloudPayload)
    }

    // 2. Try direct cloud write if online (for immediate reporting)
    if (getConnectivity().isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const columns = Object.keys(cloudPayload)
        const values = Object.values(cloudPayload)
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
        
        await pool.query(
          `INSERT INTO damaged_goods (${columns.join(', ')}) VALUES (${placeholders})
           ON CONFLICT (id) DO NOTHING`,
          values
        )
      } catch (error) {
        console.error('[DamagedGoodsService] Cloud direct write failed:', error)
        // Ignore error, queue will handle it
      }
    }

    saveDb(this.db)

    return {
      id,
      productId: data.productId,
      storeId: data.storeId,
      uomId: data.uomId,
      quantity: data.quantity,
      cost: data.cost,
      totalLoss,
      reason: data.reason,
      notes: data.notes ?? null,
      performedBy: data.performedBy,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Get all damaged goods records with product and store info
   */
  async findAll(): Promise<DamagedGood[]> {
    const stmt = this.db.prepare(`
      SELECT dg.*, 
             p.name AS product_name, p.sku AS product_sku,
             s.name AS store_name,
             u.code AS uom_code
        FROM damaged_goods dg
        LEFT JOIN product p ON p.id = dg.product_id
        LEFT JOIN store s ON s.id = dg.store_id
        LEFT JOIN uom u ON u.id = dg.uom_id
       WHERE dg.deleted_at IS NULL
       ORDER BY dg.created_at DESC
    `)
    const results: DamagedGood[] = []

    while (stmt.step()) {
      results.push(this.mapRowToDamagedGood(stmt.getAsObject()))
    }
    stmt.free()

    return results
  }

  /**
   * Get damaged goods by store ID
   */
  async findByStoreId(storeId: string): Promise<DamagedGood[]> {
    const stmt = this.db.prepare(`
      SELECT dg.*, 
             p.name AS product_name, p.sku AS product_sku,
             s.name AS store_name,
             u.code AS uom_code
        FROM damaged_goods dg
        LEFT JOIN product p ON p.id = dg.product_id
        LEFT JOIN store s ON s.id = dg.store_id
        LEFT JOIN uom u ON u.id = dg.uom_id
       WHERE dg.store_id = ? AND dg.deleted_at IS NULL
       ORDER BY dg.created_at DESC
    `)
    stmt.bind([storeId])
    const results: DamagedGood[] = []

    while (stmt.step()) {
      results.push(this.mapRowToDamagedGood(stmt.getAsObject()))
    }
    stmt.free()

    return results
  }

  /**
   * Get damaged goods by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DamagedGood[]> {
    const stmt = this.db.prepare(`
      SELECT dg.*, 
             p.name AS product_name, p.sku AS product_sku,
             s.name AS store_name,
             u.code AS uom_code
        FROM damaged_goods dg
        LEFT JOIN product p ON p.id = dg.product_id
        LEFT JOIN store s ON s.id = dg.store_id
        LEFT JOIN uom u ON u.id = dg.uom_id
       WHERE dg.created_at >= ? AND dg.created_at <= ? AND dg.deleted_at IS NULL
       ORDER BY dg.created_at DESC
    `)
    stmt.bind([startDate.getTime(), endDate.getTime()])
    const results: DamagedGood[] = []

    while (stmt.step()) {
      results.push(this.mapRowToDamagedGood(stmt.getAsObject()))
    }
    stmt.free()

    return results
  }

  /**
   * Get total loss by date range (for financial reports)
   */
  async getTotalLossByDateRange(startDate: Date, endDate: Date): Promise<{ totalLoss: string; count: number }> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_loss AS REAL)), 0) as total
        FROM damaged_goods
       WHERE created_at >= ? AND created_at <= ? AND deleted_at IS NULL
    `)
    stmt.bind([startDate.getTime(), endDate.getTime()])

    if (stmt.step()) {
      const result = stmt.getAsObject() as { total: number; count: number }
      stmt.free()
      return {
        totalLoss: String(result.total || 0),
        count: result.count || 0
      }
    }
    stmt.free()

    return { totalLoss: '0', count: 0 }
  }

  /**
   * Find damaged good by ID
   */
  async findById(id: string): Promise<DamagedGood | null> {
    const stmt = this.db.prepare(`
      SELECT dg.*, 
             p.name AS product_name, p.sku AS product_sku,
             s.name AS store_name,
             u.code AS uom_code
        FROM damaged_goods dg
        LEFT JOIN product p ON p.id = dg.product_id
        LEFT JOIN store s ON s.id = dg.store_id
        LEFT JOIN uom u ON u.id = dg.uom_id
       WHERE dg.id = ?
    `)
    stmt.bind([id])

    if (stmt.step()) {
      const result = this.mapRowToDamagedGood(stmt.getAsObject())
      stmt.free()
      return result
    }
    stmt.free()
    return null
  }

  /**
   * Soft delete a damaged goods record
   */
  async softDelete(id: string): Promise<void> {
    const now = Date.now()
    this.db.run('UPDATE damaged_goods SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])
    saveDb(this.db)

    // Sync Delete to Cloud
    if (this.queueService) {
      await this.queueService.add('DELETE', 'damaged_goods', { id })
    }

    if (getConnectivity().isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE damaged_goods SET deleted_at = NOW() WHERE id = $1', [id])
      } catch (error) {
        console.error('[DamagedGoodsService] Cloud direct delete failed:', error)
      }
    }
  }

  /**
   * Map database row to DamagedGood object
   */
  private mapRowToDamagedGood(row: any): DamagedGood {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      uomId: row.uom_id as string,
      quantity: row.quantity as number,
      cost: row.cost as string,
      totalLoss: row.total_loss as string,
      reason: row.reason as string,
      notes: row.notes as string | null,
      performedBy: row.performed_by as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null,
      productName: row.product_name as string | undefined,
      productSku: row.product_sku as string | undefined,
      storeName: row.store_name as string | undefined,
      uomCode: row.uom_code as string | undefined
    }
  }
}
