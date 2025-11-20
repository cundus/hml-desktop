import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Transaction {
  id: string
  code: string
  storeId: string
  subtotal: string
  discount: string
  tax: string
  total: string
  customerId: string | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
  items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  quantity: number
  price: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTransactionDto {
  code: string
  storeId: string
  subtotal: string
  discount?: string
  tax?: string
  total: string
  customerId?: string
  userId?: string
  items: CreateTransactionItemDto[]
}

export interface CreateTransactionItemDto {
  productId: string
  quantity: number
  price: string
}

export class TransactionService {
  constructor(private db: Database) {}

  /**
   * Get all transactions
   */
  async findAll(): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: Transaction[] = []
    
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      results.push(transaction)
    }
    stmt.free()
    
    return results
  }

  /**
   * Get transaction by ID
   */
  async findById(id: string): Promise<Transaction | undefined> {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      return transaction
    }
    stmt.free()
    return undefined
  }

  /**
   * Get transaction by code
   */
  async findByCode(code: string): Promise<Transaction | undefined> {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      return transaction
    }
    stmt.free()
    return undefined
  }

  /**
   * Get transactions by store ID
   */
  async findByStoreId(storeId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])
    
    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      results.push(transaction)
    }
    stmt.free()
    
    return results
  }

  /**
   * Get transactions by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([customerId])
    
    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      results.push(transaction)
    }
    stmt.free()
    
    return results
  }

  /**
   * Get transactions by user ID
   */
  async findByUserId(userId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([userId])
    
    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionId(transaction.id)
      results.push(transaction)
    }
    stmt.free()
    
    return results
  }

  /**
   * Get transaction items by transaction ID
   */
  async findItemsByTransactionId(transactionId: string): Promise<TransactionItem[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY created_at ASC'
    )
    stmt.bind([transactionId])
    
    const results: TransactionItem[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToTransactionItem(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Create a new transaction with items
   */
  async create(data: CreateTransactionDto): Promise<Transaction> {
    const id = randomUUID()
    const now = Date.now()
    
    // Insert transaction
    this.db.run(
      'INSERT INTO transactions (id, code, store_id, subtotal, discount, tax, total, customer_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.code,
        data.storeId,
        data.subtotal,
        data.discount ?? '0',
        data.tax ?? '0',
        data.total,
        data.customerId ?? null,
        data.userId ?? null,
        now,
        now
      ]
    )
    
    // Insert transaction items
    for (const item of data.items) {
      const itemId = randomUUID()
      this.db.run(
        'INSERT INTO transaction_items (id, transaction_id, product_id, quantity, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, id, item.productId, item.quantity, item.price, now, now]
      )
    }
    
    saveDb(this.db)
    
    const created = await this.findById(id)
    if (!created) {
      throw new Error('Transaction not found after creation')
    }
    return created
  }

  /**
   * Soft delete transaction
   */
  async softDelete(id: string): Promise<Transaction> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    )
    
    saveDb(this.db)
    
    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Transaction not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted transaction
   */
  async restore(id: string): Promise<Transaction> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    )
    
    saveDb(this.db)
    
    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Transaction not found after restore')
    }
    return restored
  }

  /**
   * Get sales summary for a store
   */
  async getSalesSummary(storeId: string, startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number
    totalRevenue: string
    totalDiscount: string
    totalTax: string
  }> {
    let query = 'SELECT COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue, SUM(CAST(discount AS REAL)) as discount, SUM(CAST(tax AS REAL)) as tax FROM transactions WHERE store_id = ? AND deleted_at IS NULL'
    const params: any[] = [storeId]
    
    if (startDate) {
      query += ' AND created_at >= ?'
      params.push(startDate.getTime())
    }
    
    if (endDate) {
      query += ' AND created_at <= ?'
      params.push(endDate.getTime())
    }
    
    const stmt = this.db.prepare(query)
    stmt.bind(params)
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return {
        totalTransactions: (row.count as number) || 0,
        totalRevenue: String((row.revenue as number) || 0),
        totalDiscount: String((row.discount as number) || 0),
        totalTax: String((row.tax as number) || 0)
      }
    }
    stmt.free()
    
    return {
      totalTransactions: 0,
      totalRevenue: '0',
      totalDiscount: '0',
      totalTax: '0'
    }
  }

  /**
   * Map database row to Transaction object
   */
  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id as string,
      code: row.code as string,
      storeId: row.store_id as string,
      subtotal: row.subtotal as string,
      discount: row.discount as string,
      tax: row.tax as string,
      total: row.total as string,
      customerId: row.customer_id as string | null,
      userId: row.user_id as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }

  /**
   * Map database row to TransactionItem object
   */
  private mapRowToTransactionItem(row: any): TransactionItem {
    return {
      id: row.id as string,
      transactionId: row.transaction_id as string,
      productId: row.product_id as string,
      quantity: row.quantity as number,
      price: row.price as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
