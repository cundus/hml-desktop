import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

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

export class StockAdjustmentService {
  constructor(private db: Database) {}

  /**
   * Get all stock adjustments
   */
  async findAll(): Promise<StockAdjustment[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_adjustment WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: StockAdjustment[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockAdjustment(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock adjustments by product ID
   */
  async findByProductId(productId: string): Promise<StockAdjustment[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_adjustment WHERE product_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([productId])

    const results: StockAdjustment[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockAdjustment(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock adjustments by store ID
   */
  async findByStoreId(storeId: string): Promise<StockAdjustment[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_adjustment WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])

    const results: StockAdjustment[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockAdjustment(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new stock adjustment
   */
  async create(data: CreateStockAdjustmentDto): Promise<StockAdjustment> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO stock_adjustment (id, product_id, store_id, difference, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.productId, data.storeId, data.difference, data.note || null, data.performedBy, now]
    )

    saveDb(this.db)

    return {
      id,
      productId: data.productId,
      storeId: data.storeId,
      difference: data.difference,
      note: data.note || null,
      performedBy: data.performedBy,
      createdAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Soft delete stock adjustment
   */
  async softDelete(id: string): Promise<StockAdjustment> {
    const now = Date.now()

    this.db.run('UPDATE stock_adjustment SET deleted_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Stock adjustment not found after delete')
    }
    return deleted
  }

  /**
   * Find stock adjustment by ID
   */
  private async findById(id: string): Promise<StockAdjustment | undefined> {
    const stmt = this.db.prepare('SELECT * FROM stock_adjustment WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToStockAdjustment(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Map database row to StockAdjustment object
   */
  private mapRowToStockAdjustment(row: any): StockAdjustment {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      difference: row.difference as number,
      note: row.note as string | null,
      performedBy: row.performed_by as string,
      createdAt: new Date(row.created_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
