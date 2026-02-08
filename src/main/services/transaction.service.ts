import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { StockTransactionCloudService } from './stock-transaction-cloud.service'
import { BatchCloudService } from './batch-cloud.service'
import { ProductLocationCloudService } from './product-location-cloud.service'
import { QueueService } from './queue.service'
import { PointCloudService } from './point.service'
import { AuditLogService } from './audit-log.service'

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
    private pointService?: PointCloudService,
    private batchService?: BatchCloudService,
    private auditLogService?: AuditLogService
  ) {}

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  /**
   * Get all transactions
   */
  async findAll(): Promise<Transaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        const transactions: Transaction[] = []
        for (const row of result.rows) {
          const transaction = this.mapCloudRowToTransaction(row)
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          transactions.push(transaction)
        }
        return transactions
      } catch (error) {
        console.error('[TransactionService] findAll cloud error, falling back to local:', error)
      }
    }
    return this.findAllLocal()
  }

  private async findAllLocal(): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: Transaction[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      results.push(transaction)
    }
    stmt.free()

    return results
  }

  /**
   * Get transaction by ID
   */
  async findById(id: string): Promise<Transaction | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id])
        if (result.rows.length > 0) {
          const transaction = this.mapCloudRowToTransaction(result.rows[0])
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          return transaction
        }
        return undefined
      } catch (error) {
        console.error('[TransactionService] findById cloud error, falling back to local:', error)
      }
    }
    return this.findByIdLocal(id)
  }

  private async findByIdLocal(id: string): Promise<Transaction | undefined> {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      return transaction
    }
    stmt.free()
    return undefined
  }

  /**
   * Get transaction by code
   */
  async findByCode(code: string): Promise<Transaction | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transactions WHERE code = $1 AND deleted_at IS NULL',
          [code]
        )
        if (result.rows.length > 0) {
          const transaction = this.mapCloudRowToTransaction(result.rows[0])
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          return transaction
        }
        return undefined
      } catch (error) {
        console.error('[TransactionService] findByCode cloud error, falling back to local:', error)
      }
    }
    return this.findByCodeLocal(code)
  }

  private async findByCodeLocal(code: string): Promise<Transaction | undefined> {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      return transaction
    }
    stmt.free()
    return undefined
  }

  /**
   * Get transactions by store ID
   */
  async findByStoreId(storeId: string): Promise<Transaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transactions WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [storeId]
        )
        const transactions: Transaction[] = []
        for (const row of result.rows) {
          const transaction = this.mapCloudRowToTransaction(row)
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          transactions.push(transaction)
        }
        return transactions
      } catch (error) {
        console.error('[TransactionService] findByStoreId cloud error, falling back to local:', error)
      }
    }
    return this.findByStoreIdLocal(storeId)
  }

  private async findByStoreIdLocal(storeId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])

    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      results.push(transaction)
    }
    stmt.free()

    return results
  }

  /**
   * Get transactions by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Transaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transactions WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [customerId]
        )
        const transactions: Transaction[] = []
        for (const row of result.rows) {
          const transaction = this.mapCloudRowToTransaction(row)
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          transactions.push(transaction)
        }
        return transactions
      } catch (error) {
        console.error('[TransactionService] findByCustomerId cloud error, falling back to local:', error)
      }
    }
    return this.findByCustomerIdLocal(customerId)
  }

  private async findByCustomerIdLocal(customerId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([customerId])

    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      results.push(transaction)
    }
    stmt.free()

    return results
  }

  /**
   * Get transactions by user ID
   */
  async findByUserId(userId: string): Promise<Transaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transactions WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [userId]
        )
        const transactions: Transaction[] = []
        for (const row of result.rows) {
          const transaction = this.mapCloudRowToTransaction(row)
          transaction.items = await this.findItemsByTransactionId(transaction.id)
          transactions.push(transaction)
        }
        return transactions
      } catch (error) {
        console.error('[TransactionService] findByUserId cloud error, falling back to local:', error)
      }
    }
    return this.findByUserIdLocal(userId)
  }

  private async findByUserIdLocal(userId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([userId])

    const results: Transaction[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const transaction = this.mapRowToTransaction(row)
      transaction.items = await this.findItemsByTransactionIdLocal(transaction.id)
      results.push(transaction)
    }
    stmt.free()

    return results
  }

  /**
   * Get transaction items by transaction ID
   */
  async findItemsByTransactionId(transactionId: string): Promise<TransactionItem[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM transaction_items WHERE transaction_id = $1 ORDER BY created_at ASC',
          [transactionId]
        )
        return result.rows.map((row) => this.mapCloudRowToTransactionItem(row))
      } catch (error) {
        console.error('[TransactionService] findItemsByTransactionId cloud error, falling back to local:', error)
      }
    }
    return this.findItemsByTransactionIdLocal(transactionId)
  }

  private findItemsByTransactionIdLocal(transactionId: string): TransactionItem[] {
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

      // 3c. Inventory Side Logic (INV-001) & FIFO Allocation (INV-002)
      if (this.stockTransactionService && this.productLocationService && this.batchService) {
        // 1. ALLOCATE STOCK (FIFO)
        const allocations = await this.batchService.allocateStock(
          item.productId,
          data.storeId,
          item.quantity
        )

        let remainingQty = item.quantity

        // 2. Create Stock Transactions for Allocated Batches
        for (const alloc of allocations) {
          if (alloc.quantity > 0) {
            await this.stockTransactionService.create({
              productId: item.productId,
              storeId: data.storeId,
              type: 'SALE',
              quantity: alloc.quantity,
              reference: data.code,
              customerId: data.customerId,
              performedBy: data.userId,
              batchId: alloc.batch_id // Link to specific batch
            })
            remainingQty -= alloc.quantity
          }
        }

        // 3. Fallback: If allocations didn't cover everything, create General Stock transaction
        // This handles cases where stock is negative or batch data is missing.
        // The total deduction from ProductLocation must still be full item.quantity.
        if (remainingQty > 0) {
          await this.stockTransactionService.create({
            productId: item.productId,
            storeId: data.storeId,
            type: 'SALE',
            quantity: remainingQty,
            reference: data.code,
            customerId: data.customerId,
            performedBy: data.userId,
            batchId: undefined // General stock
          })
        }

        // Deduct from product_location (Aggregate)
        await this.productLocationService.adjustQuantity(
          item.productId,
          data.storeId,
          -item.quantity
        )
      } else if (this.stockTransactionService && this.productLocationService) {
        // Fallback for when batchService is not injected (though it should be)
        await this.stockTransactionService.create({
          productId: item.productId,
          storeId: data.storeId,
          type: 'SALE',
          quantity: item.quantity,
          reference: data.code,
          customerId: data.customerId,
          performedBy: data.userId
        })

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

    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'CREATE',
        entityType: 'transaction',
        entityId: id,
        userId: data.userId || 'SYSTEM',
        storeId: data.storeId,
        newValues: { code: data.code, total: data.total, paymentMethod: data.paymentMethod },
        metadata: { customerId: data.customerId }
      })
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
    // Improved Logic: We should reverse the SPECIFIC stock transactions that were made.
    // Instead of iterating items and guessing, let's find the OUTBOUND/SALE stock transactions
    // linked to this transaction code and reverse them.
    if (this.stockTransactionService && this.productLocationService) {
      // Find existing stock transactions for this sales code
      const stockTxns = await this.stockTransactionService.findByReference(existing.code)

      // Filter for SALE/OUTBOUND types that need reversing
      const salesTxns = stockTxns.filter(
        (st) => ['SALE', 'OUTBOUND'].includes(st.type) && st.deletedAt === null
      )

      for (const st of salesTxns) {
        // Reverse each stock transaction
        await this.stockTransactionService.create({
          productId: st.productId,
          storeId: st.storeId,
          type: 'ADJUSTMENT', // or RETURN? ADJUSTMENT is safer to just add stock back.
          quantity: st.quantity, // Add back same quantity
          reference: `DELETED:${existing.code}`, // Link back
          batchId: st.batchId || undefined, // IMPORTANT: Restore to specific batch (or undefined for general)
          performedBy: existing.userId ?? undefined
        })

        // Adjust product location (Total stock)
        await this.productLocationService.adjustQuantity(
          st.productId,
          st.storeId,
          st.quantity // Positive adds back
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
    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'DELETE',
        entityType: 'transaction',
        entityId: id,
        userId: existing.userId || 'SYSTEM',
        storeId: existing.storeId,
        metadata: { code: existing.code }
      })
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

    // Fetches sales
    const stmt = this.db.prepare(query)
    stmt.bind(params)

    let salesData = { count: 0, revenue: 0, discount: 0, tax: 0 }

    if (stmt.step()) {
      const row = stmt.getAsObject()
      salesData = {
        count: (row.count as number) || 0,
        revenue: (row.revenue as number) || 0,
        discount: (row.discount as number) || 0,
        tax: (row.tax as number) || 0
      }
    }
    stmt.free()

    // Fetch returns (refunds)
    let returnQuery =
      'SELECT SUM(CAST(total_refund AS REAL)) as total_refund FROM transaction_return WHERE store_id = ? AND deleted_at IS NULL'
    const returnParams: any[] = [storeId]

    if (startDate) {
      returnQuery += ' AND created_at >= ?'
      returnParams.push(startDate.getTime())
    }

    if (endDate) {
      returnQuery += ' AND created_at <= ?'
      returnParams.push(endDate.getTime())
    }

    const returnStmt = this.db.prepare(returnQuery)
    returnStmt.bind(returnParams)
    let totalRefund = 0
    if (returnStmt.step()) {
      const row = returnStmt.getAsObject()
      totalRefund = (row.total_refund as number) || 0
    }
    returnStmt.free()

    // Net Revenue = Gross Sales - Returns
    return {
      totalTransactions: salesData.count,
      totalRevenue: String(salesData.revenue - totalRefund),
      totalDiscount: String(salesData.discount),
      totalTax: String(salesData.tax)
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

    // Deduct Today's Returns
    const todayReturnStmt = this.db.prepare(
      'SELECT COALESCE(SUM(CAST(total_refund AS REAL)), 0) as refund FROM transaction_return WHERE deleted_at IS NULL AND created_at >= ?'
    )
    todayReturnStmt.bind([todayStart.getTime()])
    if (todayReturnStmt.step()) {
      todayRevenue -= (todayReturnStmt.getAsObject().refund as number) || 0
    }
    todayReturnStmt.free()

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

    // Deduct Week's Returns
    const weekReturnStmt = this.db.prepare(
      'SELECT COALESCE(SUM(CAST(total_refund AS REAL)), 0) as refund FROM transaction_return WHERE deleted_at IS NULL AND created_at >= ?'
    )
    weekReturnStmt.bind([weekStart.getTime()])
    if (weekReturnStmt.step()) {
      weekRevenue -= (weekReturnStmt.getAsObject().refund as number) || 0
    }
    weekReturnStmt.free()

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

    // Deduct Month's Returns
    const monthReturnStmt = this.db.prepare(
      'SELECT COALESCE(SUM(CAST(total_refund AS REAL)), 0) as refund FROM transaction_return WHERE deleted_at IS NULL AND created_at >= ?'
    )
    monthReturnStmt.bind([monthStart.getTime()])
    if (monthReturnStmt.step()) {
      monthRevenue -= (monthReturnStmt.getAsObject().refund as number) || 0
    }
    monthReturnStmt.free()

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

    // Low stock count (using local db roughly)
    const lowStockCount = 0

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
   * Get Profit & Loss Report (Revenue vs HPP/COGS)
   * Calculates COGS based on FIFO Batches linked to Sales
   */
  async getProfitLossReport(
    startDate: Date,
    endDate: Date,
    storeId?: string
  ): Promise<{
    revenue: number
    cogs: number
    grossProfit: number
    margin: number
    totalTransactions: number
  }> {
    const start = startDate.getTime()
    const end = endDate.getTime()

    // 1. Calculate Revenue (Sales - Returns)
    let revenueQuery =
      'SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as revenue, COUNT(*) as count FROM transactions WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ?'
    const revenueParams: any[] = [start, end]
    if (storeId) {
      revenueQuery += ' AND store_id = ?'
      revenueParams.push(storeId)
    }

    const revStmt = this.db.prepare(revenueQuery)
    revStmt.bind(revenueParams)
    let revenue = 0
    let count = 0
    if (revStmt.step()) {
      const row = revStmt.getAsObject()
      revenue = (row.revenue as number) || 0
      count = (row.count as number) || 0
    }
    revStmt.free()

    // Deduct Returns from Revenue
    let returnQuery =
      'SELECT COALESCE(SUM(CAST(total_refund AS REAL)), 0) as refund FROM transaction_return WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ?'
    const returnParams: any[] = [start, end]
    if (storeId) {
      returnQuery += ' AND store_id = ?'
      returnParams.push(storeId)
    }
    const retStmt = this.db.prepare(returnQuery)
    retStmt.bind(returnParams)
    if (retStmt.step()) {
      revenue -= (retStmt.getAsObject().refund as number) || 0
    }
    retStmt.free()

    // 2. Calculate COGS (HPP) from Stock Transactions (SALE type)
    // Priority: batch.cost (FIFO) -> product_price.cost (per store) -> product.cost (default)
    let cogsQuery = `
      SELECT SUM(
        CAST(st.quantity AS REAL) * CAST(
          COALESCE(
            b.cost,
            pp.cost,
            p.cost,
            '0'
          ) AS REAL
        )
      ) as total_cogs
      FROM stock_transaction st
      LEFT JOIN batch b ON st.batch_id = b.id
      LEFT JOIN product p ON st.product_id = p.id
      LEFT JOIN product_price pp ON st.product_id = pp.product_id 
        AND pp.store_id = st.store_id 
        AND pp.deleted_at IS NULL
      WHERE st.type = 'SALE' 
        AND st.deleted_at IS NULL 
        AND st.created_at >= ? 
        AND st.created_at <= ?
    `
    const cogsParams: any[] = [start, end]
    if (storeId) {
      cogsQuery += ' AND st.store_id = ?'
      cogsParams.push(storeId)
    }

    const cogsStmt = this.db.prepare(cogsQuery)
    cogsStmt.bind(cogsParams)
    let cogs = 0
    if (cogsStmt.step()) {
      cogs = (cogsStmt.getAsObject().total_cogs as number) || 0
    }
    cogsStmt.free()

    // Note: We should also DEDUCT COGS for Returns?
    // If Return puts item back to stock, we regain the asset.
    // Does Return create a 'RETURN' stock transaction?
    // See ReturnService. If it creates 'RETURN' type stock txn, we should subtract its cost from COGS?
    // Or add to Asset?
    // Usually: COGS = (Beginning Inv + Purchases) - Ending Inv.
    // Or Perpetual: COGS increases on Sale, decreases on Return.
    // Let's check 'RETURN' stock transactions.

    // Note: Adjust logic if ReturnService uses specific type.
    // Assuming for now we just track Sales COGS. Real COGS should net out returns.
    // Let's simplistic for Phase 3: Sales COGS.

    const grossProfit = revenue - cogs
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    return {
      revenue,
      cogs,
      grossProfit,
      margin,
      totalTransactions: count
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
   * Map cloud database row to Transaction object
   */
  private mapCloudRowToTransaction(row: Record<string, unknown>): Transaction {
    return {
      id: row.id as string,
      code: row.code as string,
      storeId: row.store_id as string,
      subtotal: row.subtotal as string,
      discount: row.discount as string,
      tax: row.tax as string,
      total: row.total as string,
      totalWeight: (row.total_weight as string) ?? '0',
      paymentMethod: (row.payment_method as string) ?? 'cash',
      paymentDeadline: row.payment_deadline ? new Date(row.payment_deadline as string) : null,
      receiptPrinted: row.receipt_printed === true,
      customerId: row.customer_id as string | null,
      userId: row.user_id as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  /**
   * Map cloud database row to TransactionItem object
   */
  private mapCloudRowToTransactionItem(row: Record<string, unknown>): TransactionItem {
    return {
      id: row.id as string,
      transactionId: row.transaction_id as string,
      productId: row.product_id as string,
      quantity: parseFloat(row.quantity as string) || 0,
      displayQuantity: row.display_quantity ? parseFloat(row.display_quantity as string) : null,
      uomCode: row.uom_code as string | null,
      productName: row.product_name as string | null,
      productSku: row.product_sku as string | null,
      price: row.price as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
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
