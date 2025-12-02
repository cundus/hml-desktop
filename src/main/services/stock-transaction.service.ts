import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export type StockTransactionType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'SALE'

export interface StockTransaction {
  id: string
  productId: string
  storeId: string
  type: StockTransactionType
  quantity: number
  reference: string | null
  batchId: string | null
  supplierId: string | null
  customerId: string | null
  performedBy: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export interface CreateStockTransactionDto {
  productId: string
  storeId: string
  type: StockTransactionType
  quantity: number
  reference?: string
  batchId?: string
  supplierId?: string
  customerId?: string
  performedBy?: string
}

export class StockTransactionService {
  constructor(private db: Database) {}

  /**
   * Get all stock transactions
   */
  async findAll(): Promise<StockTransaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_transaction WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: StockTransaction[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockTransaction(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock transaction by ID
   */
  async findById(id: string): Promise<StockTransaction | undefined> {
    const stmt = this.db.prepare('SELECT * FROM stock_transaction WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToStockTransaction(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get stock transactions by product ID
   */
  async findByProductId(productId: string): Promise<StockTransaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_transaction WHERE product_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([productId])

    const results: StockTransaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockTransaction(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock transactions by store ID
   */
  async findByStoreId(storeId: string): Promise<StockTransaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_transaction WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])

    const results: StockTransaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockTransaction(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock transactions by type
   */
  async findByType(type: StockTransactionType): Promise<StockTransaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_transaction WHERE type = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([type])

    const results: StockTransaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockTransaction(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get stock transactions by reference
   */
  async findByReference(reference: string): Promise<StockTransaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_transaction WHERE reference = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([reference])

    const results: StockTransaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStockTransaction(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new stock transaction
   */
  async create(data: CreateStockTransactionDto): Promise<StockTransaction> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO stock_transaction (id, product_id, store_id, type, quantity, reference, batch_id, supplier_id, customer_id, performed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.storeId,
        data.type,
        data.quantity,
        data.reference ?? null,
        data.batchId ?? null,
        data.supplierId ?? null,
        data.customerId ?? null,
        data.performedBy ?? null,
        now,
        now
      ]
    )

    saveDb(this.db)

    return {
      id,
      productId: data.productId,
      storeId: data.storeId,
      type: data.type,
      quantity: data.quantity,
      reference: data.reference ?? null,
      batchId: data.batchId ?? null,
      supplierId: data.supplierId ?? null,
      customerId: data.customerId ?? null,
      performedBy: data.performedBy ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Soft delete stock transaction
   */
  async softDelete(id: string): Promise<StockTransaction> {
    const now = Date.now()

    this.db.run('UPDATE stock_transaction SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Stock transaction not found after delete')
    }
    return deleted
  }

  /**
   * Get stock summary for a product at a store
   */
  async getStockSummary(
    productId: string,
    storeId: string
  ): Promise<{
    totalIn: number
    totalOut: number
    currentStock: number
  }> {
    // Calculate total inbound
    const inStmt = this.db.prepare(
      "SELECT SUM(quantity) as total FROM stock_transaction WHERE product_id = ? AND store_id = ? AND type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT') AND deleted_at IS NULL"
    )
    inStmt.bind([productId, storeId])

    let totalIn = 0
    if (inStmt.step()) {
      const row = inStmt.getAsObject()
      totalIn = (row.total as number) || 0
    }
    inStmt.free()

    // Calculate total outbound
    const outStmt = this.db.prepare(
      "SELECT SUM(quantity) as total FROM stock_transaction WHERE product_id = ? AND store_id = ? AND type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE') AND deleted_at IS NULL"
    )
    outStmt.bind([productId, storeId])

    let totalOut = 0
    if (outStmt.step()) {
      const row = outStmt.getAsObject()
      totalOut = (row.total as number) || 0
    }
    outStmt.free()

    return {
      totalIn,
      totalOut,
      currentStock: totalIn - totalOut
    }
  }

  /**
   * Map database row to StockTransaction object
   */
  private mapRowToStockTransaction(row: any): StockTransaction {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      type: row.type as StockTransactionType,
      quantity: row.quantity as number,
      reference: row.reference as string | null,
      batchId: row.batch_id as string | null,
      supplierId: row.supplier_id as string | null,
      customerId: row.customer_id as string | null,
      performedBy: row.performed_by as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
