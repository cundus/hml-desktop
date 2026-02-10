/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto'
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
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  /**
   * Create a new damaged goods record
   */
  async create(data: CreateDamagedGoodDto): Promise<DamagedGood> {
    if (!this.isOnline()) {
      throw new Error('Recording damaged goods requires internet connection')
    }

    const id = randomUUID()
    const now = new Date()
    const totalLoss = (parseFloat(data.cost) * data.quantity).toString()

    try {
      const pool = getCloudDb().getPool()
      await pool.query(
        `INSERT INTO damaged_goods 
          (id, product_id, store_id, uom_id, quantity, cost, total_loss, reason, notes, performed_by, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
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
    } catch (error) {
      console.error('[DamagedGoodsService] create error:', error)
      throw error
    }

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
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Get all damaged goods records with product and store info
   */
  async findAll(): Promise<DamagedGood[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(`
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
      return result.rows.map((row: any) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[DamagedGoodsService] findAll error:', error)
      throw error
    }
  }

  /**
   * Get damaged goods by store ID
   */
  async findByStoreId(storeId: string): Promise<DamagedGood[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(`
        SELECT dg.*, 
               p.name AS product_name, p.sku AS product_sku,
               s.name AS store_name,
               u.code AS uom_code
          FROM damaged_goods dg
          LEFT JOIN product p ON p.id = dg.product_id
          LEFT JOIN store s ON s.id = dg.store_id
          LEFT JOIN uom u ON u.id = dg.uom_id
         WHERE dg.store_id = $1 AND dg.deleted_at IS NULL
         ORDER BY dg.created_at DESC
      `, [storeId])
      return result.rows.map((row: any) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[DamagedGoodsService] findByStoreId error:', error)
      throw error
    }
  }

  /**
   * Get damaged goods by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DamagedGood[]> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(`
        SELECT dg.*, 
               p.name AS product_name, p.sku AS product_sku,
               s.name AS store_name,
               u.code AS uom_code
          FROM damaged_goods dg
          LEFT JOIN product p ON p.id = dg.product_id
          LEFT JOIN store s ON s.id = dg.store_id
          LEFT JOIN uom u ON u.id = dg.uom_id
         WHERE dg.created_at >= $1 AND dg.created_at <= $2 AND dg.deleted_at IS NULL
         ORDER BY dg.created_at DESC
      `, [startDate.toISOString(), endDate.toISOString()])
      return result.rows.map((row: any) => this.mapCloudRow(row))
    } catch (error) {
      console.error('[DamagedGoodsService] findByDateRange error:', error)
      throw error
    }
  }

  /**
   * Get total loss by date range (for financial reports)
   */
  async getTotalLossByDateRange(startDate: Date, endDate: Date): Promise<{ totalLoss: string; count: number }> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(CAST(total_loss AS REAL)), 0) as total
          FROM damaged_goods
         WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
      `, [startDate.toISOString(), endDate.toISOString()])

      const row = result.rows[0]
      return {
        totalLoss: String(parseFloat(row.total) || 0),
        count: parseInt(row.count) || 0
      }
    } catch (error) {
      console.error('[DamagedGoodsService] getTotalLossByDateRange error:', error)
      throw error
    }
  }

  /**
   * Find damaged good by ID
   */
  async findById(id: string): Promise<DamagedGood | null> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      const result = await pool.query(`
        SELECT dg.*, 
               p.name AS product_name, p.sku AS product_sku,
               s.name AS store_name,
               u.code AS uom_code
          FROM damaged_goods dg
          LEFT JOIN product p ON p.id = dg.product_id
          LEFT JOIN store s ON s.id = dg.store_id
          LEFT JOIN uom u ON u.id = dg.uom_id
         WHERE dg.id = $1
      `, [id])

      if (result.rows.length > 0) {
        return this.mapCloudRow(result.rows[0])
      }
      return null
    } catch (error) {
      console.error('[DamagedGoodsService] findById error:', error)
      throw error
    }
  }

  /**
   * Soft delete a damaged goods record
   */
  async softDelete(id: string): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Offline mode not supported for damaged goods')
    }

    try {
      const pool = getCloudDb().getPool()
      await pool.query('UPDATE damaged_goods SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [id])
    } catch (error) {
      console.error('[DamagedGoodsService] softDelete error:', error)
      throw error
    }
  }

  /**
   * Map cloud database row to DamagedGood object
   */
  private mapCloudRow(row: any): DamagedGood {
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncedAt: row.synced_at ? new Date(row.synced_at) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      deviceId: row.device_id as string | null,
      productName: row.product_name as string | undefined,
      productSku: row.product_sku as string | undefined,
      storeName: row.store_name as string | undefined,
      uomCode: row.uom_code as string | undefined
    }
  }
}
