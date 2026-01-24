import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { StockTransactionCloudService } from './stock-transaction-cloud.service'
import { ProductLocationCloudService } from './product-location-cloud.service'
import { QueueService } from './queue.service'
import { PointCloudService } from './point.service'

export interface Transaction {
  id: string
  code: string
  storeId: string
  subtotal: string
  discount: string
  tax: string
  total: string
  totalWeight: string
  paymentMethod: string
  paymentDeadline: Date | null
  receiptPrinted: boolean
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
  displayQuantity: number | null
  uomCode: string | null
  productName: string | null
  productSku: string | null
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
  totalWeight?: string
  paymentMethod?: string
  paymentDeadline?: Date
  receiptPrinted?: boolean
  customerId?: string
  userId?: string
  salesId?: string
  salesName?: string
  items: CreateTransactionItemDto[]
}

export interface CreateTransactionItemDto {
  productId: string
  quantity: number
  displayQuantity?: number
  uomCode?: string
  productName?: string
  productSku?: string
  price: string
}

export interface UpdateTransactionDto {
  subtotal?: string
  discount?: string
  tax?: string
  total?: string
  paymentMethod?: string
  paymentDeadline?: Date | null
  customerId?: string | null
  items?: UpdateTransactionItemDto[]
}

export interface UpdateTransactionItemDto {
  id?: string // existing item ID (for update/delete)
  productId: string
  quantity: number
  price: string
}

export class TransactionService {
  constructor(
    private db: Database,
    private stockTransactionService?: StockTransactionCloudService,
    private productLocationService?: ProductLocationCloudService,
    private queueService?: QueueService,
    private pointService?: PointCloudService
  ) {}

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
    const nowIso = new Date(now).toISOString()

    // 1. Queue Transaction Header INSERT (Cloud-First pattern: queue it immediately)
    // We queue BEFORE local insert to ensure we capture the intent, though strictly for offline-fallback it doesn't matter much.
    // Important: Header must be queued BEFORE items for FK constraints.
    if (this.queueService) {
      await this.queueService.add('INSERT', 'transactions', {
        id,
        code: data.code,
        store_id: data.storeId,
        subtotal: data.subtotal,
        discount: data.discount ?? '0',
        tax: data.tax ?? '0',
        total: data.total,
        total_weight: data.totalWeight ?? '0',
        payment_method: data.paymentMethod ?? 'cash',
        payment_deadline: data.paymentDeadline ? data.paymentDeadline.toISOString() : null,
        receipt_printed: (data.receiptPrinted ?? false) ? 1 : 0,
        customer_id: data.customerId ?? null,
        user_id: data.userId ?? null,
        sales_id: data.salesId ?? null,
        sales_name: data.salesName ?? null,
        created_at: nowIso,
        updated_at: nowIso
      })
    }

    // 2. Insert transaction locally
    this.db.run(
      'INSERT INTO transactions (id, code, store_id, subtotal, discount, tax, total, total_weight, payment_method, payment_deadline, receipt_printed, customer_id, user_id, sales_id, sales_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.code,
        data.storeId,
        data.subtotal,
        data.discount ?? '0',
        data.tax ?? '0',
        data.total,
        data.totalWeight ?? '0',
        data.paymentMethod ?? 'cash',
        data.paymentDeadline ? data.paymentDeadline.getTime() : null,
        (data.receiptPrinted ?? false) ? 1 : 0,
        data.customerId ?? null,
        data.userId ?? null,
        data.salesId ?? null,
        data.salesName ?? null,
        now,
        now
      ]
    )

    // 3. Process Items
    for (const item of data.items) {
      const itemId = randomUUID()

      // 3a. Queue Item INSERT
      if (this.queueService) {
        await this.queueService.add('INSERT', 'transaction_items', {
          id: itemId,
          transaction_id: id,
          product_id: item.productId,
          quantity: item.quantity,
          display_quantity: item.displayQuantity ?? item.quantity,
          uom_code: item.uomCode ?? null,
          product_name: item.productName ?? null,
          product_sku: item.productSku ?? null,
          price: item.price,
          created_at: nowIso,
          updated_at: nowIso
        })
      }

      // 3b. Insert Item Locally
      this.db.run(
        'INSERT INTO transaction_items (id, transaction_id, product_id, quantity, display_quantity, uom_code, product_name, product_sku, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          itemId,
          id,
          item.productId,
          item.quantity,
          item.displayQuantity ?? item.quantity,
          item.uomCode ?? null,
          item.productName ?? null,
          item.productSku ?? null,
          item.price,
          now,
          now
        ]
      )

      // 3c. Inventory Side Logic (INV-001)
      if (this.stockTransactionService && this.productLocationService) {
        // Create SALE stock transaction
        await this.stockTransactionService.create({
          productId: item.productId,
          storeId: data.storeId,
          type: 'SALE',
          quantity: item.quantity,
          reference: data.code,
          customerId: data.customerId,
          performedBy: data.userId
        })

        // Deduct from product_location
        await this.productLocationService.adjustQuantity(
          item.productId,
          data.storeId,
          -item.quantity
        )
      }
    }

    saveDb(this.db)

    const created = await this.findById(id)
    if (!created) {
      throw new Error('Transaction not found after creation')
    }

    // Earn points for customer if applicable
    if (data.customerId && this.pointService) {
      try {
        const pointResult = await this.pointService.addPoints({
          customerId: data.customerId,
          transactionId: id,
          transactionTotal: Number(data.total)
        })
        if (pointResult) {
          console.log(
            `[Transaction] Customer ${data.customerId} earned ${pointResult.points} points`
          )
        }
      } catch (error) {
        console.error('[Transaction] Failed to add points:', error)
        // Don't fail the transaction if points fail
      }
    }

    return created
  }

  /**
   * Soft delete transaction (reverses inventory)
   */
  async softDelete(id: string): Promise<Transaction> {
    // First fetch the transaction to get items and storeId
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Transaction not found')
    }

    // Reverse stock for all items
    if (this.stockTransactionService && this.productLocationService && existing.items) {
      for (const item of existing.items) {
        await this.stockTransactionService.create({
          productId: item.productId,
          storeId: existing.storeId,
          type: 'ADJUSTMENT',
          quantity: item.quantity,
          reference: `DELETED:${existing.code}`,
          performedBy: existing.userId ?? undefined
        })
        await this.productLocationService.adjustQuantity(
          item.productId,
          existing.storeId,
          item.quantity // add back to stock
        )
      }
    }

    const now = Date.now()

    this.db.run('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Transaction not found after delete')
    }
    return deleted
  }

  /**
   * Update transaction (for corrections)
   * Note: This recalculates inventory if items change
   */
  async update(id: string, data: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Transaction not found')
    }

    const now = Date.now()

    // Update main transaction fields
    const updates: string[] = []
    const params: (string | number | null)[] = []

    if (data.subtotal !== undefined) {
      updates.push('subtotal = ?')
      params.push(data.subtotal)
    }
    if (data.discount !== undefined) {
      updates.push('discount = ?')
      params.push(data.discount)
    }
    if (data.tax !== undefined) {
      updates.push('tax = ?')
      params.push(data.tax)
    }
    if (data.total !== undefined) {
      updates.push('total = ?')
      params.push(data.total)
    }
    if (data.paymentMethod !== undefined) {
      updates.push('payment_method = ?')
      params.push(data.paymentMethod)
    }
    if (data.paymentDeadline !== undefined) {
      updates.push('payment_deadline = ?')
      params.push(data.paymentDeadline ? data.paymentDeadline.getTime() : null)
    }
    if (data.customerId !== undefined) {
      updates.push('customer_id = ?')
      params.push(data.customerId)
    }

    updates.push('updated_at = ?')
    params.push(now)
    params.push(id)

    if (updates.length > 1) {
      this.db.run(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    // Update items if provided
    if (data.items) {
      const existingItems = existing.items ?? []
      const existingItemIds = new Set(existingItems.map((i) => i.id))
      const newItemIds = new Set(data.items.filter((i) => i.id).map((i) => i.id))

      // Delete removed items (and reverse inventory)
      for (const oldItem of existingItems) {
        if (!newItemIds.has(oldItem.id)) {
          // Reverse the inventory deduction
          if (this.stockTransactionService && this.productLocationService) {
            await this.stockTransactionService.create({
              productId: oldItem.productId,
              storeId: existing.storeId,
              type: 'ADJUSTMENT',
              quantity: oldItem.quantity,
              reference: `CORRECTION:${existing.code}`,
              performedBy: existing.userId ?? undefined
            })
            await this.productLocationService.adjustQuantity(
              oldItem.productId,
              existing.storeId,
              oldItem.quantity // add back
            )
          }
          this.db.run('DELETE FROM transaction_items WHERE id = ?', [oldItem.id])
        }
      }

      // Update existing or add new items
      for (const newItem of data.items) {
        if (newItem.id && existingItemIds.has(newItem.id)) {
          // Update existing item
          const oldItem = existingItems.find((i) => i.id === newItem.id)
          if (oldItem) {
            const qtyDiff = newItem.quantity - oldItem.quantity

            // Adjust inventory for quantity change
            if (qtyDiff !== 0 && this.stockTransactionService && this.productLocationService) {
              await this.stockTransactionService.create({
                productId: newItem.productId,
                storeId: existing.storeId,
                type: qtyDiff > 0 ? 'SALE' : 'ADJUSTMENT',
                quantity: Math.abs(qtyDiff),
                reference: `CORRECTION:${existing.code}`,
                performedBy: existing.userId ?? undefined
              })
              await this.productLocationService.adjustQuantity(
                newItem.productId,
                existing.storeId,
                -qtyDiff // negative if selling more, positive if returning
              )
            }

            this.db.run(
              'UPDATE transaction_items SET product_id = ?, quantity = ?, price = ?, updated_at = ? WHERE id = ?',
              [newItem.productId, newItem.quantity, newItem.price, now, newItem.id]
            )
          }
        } else {
          // Add new item
          const itemId = randomUUID()
          this.db.run(
            'INSERT INTO transaction_items (id, transaction_id, product_id, quantity, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [itemId, id, newItem.productId, newItem.quantity, newItem.price, now, now]
          )

          // Deduct inventory for new item
          if (this.stockTransactionService && this.productLocationService) {
            await this.stockTransactionService.create({
              productId: newItem.productId,
              storeId: existing.storeId,
              type: 'SALE',
              quantity: newItem.quantity,
              reference: `CORRECTION:${existing.code}`,
              performedBy: existing.userId ?? undefined
            })
            await this.productLocationService.adjustQuantity(
              newItem.productId,
              existing.storeId,
              -newItem.quantity
            )
          }
        }
      }
    }

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Transaction not found after update')
    }
    return updated
  }

  /**
   * Update receipt printed status
   */
  async updateReceiptPrinted(id: string, printed: boolean): Promise<Transaction> {
    const now = Date.now()

    this.db.run('UPDATE transactions SET receipt_printed = ?, updated_at = ? WHERE id = ?', [
      printed ? 1 : 0,
      now,
      id
    ])

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Transaction not found after update')
    }
    return updated
  }

  /**
   * Restore soft-deleted transaction
   */
  async restore(id: string): Promise<Transaction> {
    const now = Date.now()

    this.db.run('UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

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
  async getSalesSummary(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTransactions: number
    totalRevenue: string
    totalDiscount: string
    totalTax: string
  }> {
    let query =
      'SELECT COUNT(*) as count, SUM(CAST(total AS REAL)) as revenue, SUM(CAST(discount AS REAL)) as discount, SUM(CAST(tax AS REAL)) as tax FROM transactions WHERE store_id = ? AND deleted_at IS NULL'
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
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{
    todayRevenue: number
    todayTransactions: number
    weekRevenue: number
    weekTransactions: number
    monthRevenue: number
    monthTransactions: number
    totalProducts: number
    totalCustomers: number
    lowStockCount: number
  }> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Today's stats
    const todayStmt = this.db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as revenue FROM transactions WHERE deleted_at IS NULL AND created_at >= ?'
    )
    todayStmt.bind([todayStart.getTime()])
    let todayRevenue = 0
    let todayTransactions = 0
    if (todayStmt.step()) {
      const row = todayStmt.getAsObject()
      todayRevenue = (row.revenue as number) || 0
      todayTransactions = (row.count as number) || 0
    }
    todayStmt.free()

    // Week's stats
    const weekStmt = this.db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as revenue FROM transactions WHERE deleted_at IS NULL AND created_at >= ?'
    )
    weekStmt.bind([weekStart.getTime()])
    let weekRevenue = 0
    let weekTransactions = 0
    if (weekStmt.step()) {
      const row = weekStmt.getAsObject()
      weekRevenue = (row.revenue as number) || 0
      weekTransactions = (row.count as number) || 0
    }
    weekStmt.free()

    // Month's stats
    const monthStmt = this.db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(CAST(total AS REAL)), 0) as revenue FROM transactions WHERE deleted_at IS NULL AND created_at >= ?'
    )
    monthStmt.bind([monthStart.getTime()])
    let monthRevenue = 0
    let monthTransactions = 0
    if (monthStmt.step()) {
      const row = monthStmt.getAsObject()
      monthRevenue = (row.revenue as number) || 0
      monthTransactions = (row.count as number) || 0
    }
    monthStmt.free()

    // Total products
    const productStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM product WHERE deleted_at IS NULL AND is_active = 1'
    )
    let totalProducts = 0
    if (productStmt.step()) {
      const row = productStmt.getAsObject()
      totalProducts = (row.count as number) || 0
    }
    productStmt.free()

    // Total customers
    const customerStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM customer WHERE deleted_at IS NULL'
    )
    let totalCustomers = 0
    if (customerStmt.step()) {
      const row = customerStmt.getAsObject()
      totalCustomers = (row.count as number) || 0
    }
    customerStmt.free()

    // Low stock count (products with quantity < 10)
    const lowStockStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM product_location WHERE quantity < 10'
    )
    let lowStockCount = 0
    if (lowStockStmt.step()) {
      const row = lowStockStmt.getAsObject()
      lowStockCount = (row.count as number) || 0
    }
    lowStockStmt.free()

    return {
      todayRevenue,
      todayTransactions,
      weekRevenue,
      weekTransactions,
      monthRevenue,
      monthTransactions,
      totalProducts,
      totalCustomers,
      lowStockCount
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
      totalWeight: (row.total_weight as string) ?? '0',
      paymentMethod: (row.payment_method as string) ?? 'cash', // Backward compatibility
      paymentDeadline: row.payment_deadline ? new Date(row.payment_deadline as number) : null,
      receiptPrinted: (row.receipt_printed as number) === 1, // Convert SQLite boolean
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
      displayQuantity: row.display_quantity as number | null,
      uomCode: row.uom_code as string | null,
      productName: row.product_name as string | null,
      productSku: row.product_sku as string | null,
      price: row.price as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
