import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface StockAdjustment {
  id: string
  productId: string
  storeId: string
  difference: number
  note: string | null
  performedBy: string
  createdAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export interface CreateStockAdjustmentDto {
  productId: string
  storeId: string
  difference: number
  note?: string
  performedBy: string
}

export class StockAdjustmentCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<StockAdjustment[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_adjustment WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockAdjustmentCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_adjustment WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: StockAdjustment[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByProductId(productId: string): Promise<StockAdjustment[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_adjustment WHERE product_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [productId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockAdjustmentCloud] findByProductId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_adjustment WHERE product_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([productId])
    const results: StockAdjustment[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByStoreId(storeId: string): Promise<StockAdjustment[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_adjustment WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [storeId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockAdjustmentCloud] findByStoreId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_adjustment WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])
    const results: StockAdjustment[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async create(data: CreateStockAdjustmentDto): Promise<StockAdjustment> {
    const id = randomUUID()
    const now = new Date()
    const sa: StockAdjustment = {
      id,
      productId: data.productId,
      storeId: data.storeId,
      difference: data.difference,
      note: data.note || null,
      performedBy: data.performedBy,
      createdAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO stock_adjustment (id, product_id, store_id, difference, note, performed_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            id,
            data.productId,
            data.storeId,
            data.difference,
            data.note || null,
            data.performedBy,
            now,
            now
          ]
        )
        return sa
      } catch (error) {
        console.error('[StockAdjustmentCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO stock_adjustment (id, product_id, store_id, difference, note, performed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.storeId,
        data.difference,
        data.note || null,
        data.performedBy,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'stock_adjustment', {
      id,
      product_id: data.productId,
      store_id: data.storeId,
      difference: data.difference,
      note: data.note || null,
      performed_by: data.performedBy,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return sa
  }

  private mapCloudRow(row: any): StockAdjustment {
    return {
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      difference: row.difference,
      note: row.note,
      performedBy: row.performed_by,
      createdAt: new Date(row.created_at),
      syncedAt: row.synced_at ? new Date(row.synced_at) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      deviceId: row.device_id
    }
  }

  private mapLocalRow(row: any): StockAdjustment {
    return {
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      difference: row.difference,
      note: row.note,
      performedBy: row.performed_by,
      createdAt: new Date(row.created_at),
      syncedAt: row.synced_at ? new Date(row.synced_at) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      deviceId: row.device_id
    }
  }
}
