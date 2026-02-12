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
  displayQuantity?: number
  uomCode?: string
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

        // Merge with local pending changes (updates/deletes)
        // const localPending = await this.findLocalPendingChanges()
        return transactions
      } catch (error) {
        console.error('[TransactionService] findAll cloud error, falling back to local:', error)
      }
    }
    // return this.findAllLocal()
    return []
  }

 
  /*
   * Helper to merge cloud transactions with local pending changes (updates/deletes)
   */
  private mergeWithLocalPending(
    cloudTransactions: Transaction[],
    localPending: Transaction[]
  ): Transaction[] {
    const transactionMap = new Map<string, Transaction>()

    // Add cloud transactions first
    for (const t of cloudTransactions) {
      transactionMap.set(t.id, t)
    }

    // Apply local pending changes
    for (const local of localPending) {
      if (local.deletedAt) {
        // If deleted locally, remove from list
        transactionMap.delete(local.id)
      } else {
        // If updated/new locally, add/overwrite
        transactionMap.set(local.id, local)
      }
    }

    return Array.from(transactionMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
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
        // If not found in cloud, try local (might be unsynced new transaction)
        return this.findByIdLocal(id)
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
        // If not found in cloud, try local
        return this.findByCodeLocal(code)
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

        // Merge with local pending changes for this store
        const localPending = await this.findLocalPendingChangesByStoreId(storeId)
        return this.mergeWithLocalPending(transactions, localPending)
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

  private async findLocalPendingChangesByStoreId(storeId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE store_id = ? AND (synced_at IS NULL OR updated_at > synced_at) ORDER BY created_at DESC'
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

        // Merge with local pending changes for this customer
        const localPending = await this.findLocalPendingChangesByCustomerId(customerId)
        return this.mergeWithLocalPending(transactions, localPending)
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

  private async findLocalPendingChangesByCustomerId(customerId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE customer_id = ? AND (synced_at IS NULL OR updated_at > synced_at) ORDER BY created_at DESC'
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

        // Merge with local pending changes for this user
        const localPending = await this.findLocalPendingChangesByUserId(userId)
        return this.mergeWithLocalPending(transactions, localPending)
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

  private async findLocalPendingChangesByUserId(userId: string): Promise<Transaction[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? AND (synced_at IS NULL OR updated_at > synced_at) ORDER BY created_at DESC'
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
        // Reverse each stock transaction by soft deleting it
        // Note: We do NOT create a new adjustment transaction here because soft-deleting the original
        // 'SALE' transaction effectively removes the deduction from history calculations.
        // Creating an adjustment AND deleting the sale would result in double counting (virtual stock gain).
        
        await this.stockTransactionService.softDelete(st.id)

        // Adjust product location (Total stock)
        // We MUST adjust the counter validation because ProductLocation is a snapshot.
        await this.productLocationService.adjustQuantity(
          st.productId,
          st.storeId,
          st.quantity // Positive adds back
        )
      }
    }

    const now = Date.now()
    const nowDate = new Date(now)
    const pool = getCloudDb().getPool()
    await pool.query('UPDATE transactions SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
      nowDate,
      nowDate,
      id
    ])

    this.db.run('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    // Cascade soft-delete to related transaction_return and transaction_return_item
    try {
      const returnsRes = await pool.query(
        'SELECT id FROM transaction_return WHERE transaction_id = $1 AND deleted_at IS NULL',
        [id]
      )
      if (returnsRes.rows.length > 0) {
        const returnIds = returnsRes.rows.map((r: any) => r.id)
        await pool.query(
          'UPDATE transaction_return SET deleted_at = $1, updated_at = $2 WHERE transaction_id = $3 AND deleted_at IS NULL',
          [nowDate, nowDate, id]
        )
        for (const returnId of returnIds) {
          await pool.query(
            'UPDATE transaction_return_item SET deleted_at = $1, updated_at = $2 WHERE return_id = $3 AND deleted_at IS NULL',
            [nowDate, nowDate, returnId]
          )
        }
      }
    } catch (error) {
      console.error('[TransactionService] Failed to cascade soft-delete to returns:', error)
    }

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
    // 1. Validate & Setup
    // Ensure we are working with the latest cloud data (if online)
    // findById checks isOnline() and fetches from cloud if available
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Transaction not found')
    }

    const pool = this.isOnline() ? getCloudDb().getPool() : null
    const now = new Date()
    const nowTs = now.getTime()

    // 2. Prepare Transaction Header Updates
    const cloudUpdates: string[] = []
    const cloudParams: (string | number | null | Date)[] = []
    let cloudParamIndex = 1

    const localUpdates: string[] = []
    const localParams: (string | number | null)[] = []

    if (data.subtotal !== undefined) {
      cloudUpdates.push(`subtotal = $${cloudParamIndex++}`)
      cloudParams.push(data.subtotal)
      localUpdates.push('subtotal = ?')
      localParams.push(data.subtotal)
    }
    if (data.discount !== undefined) {
      cloudUpdates.push(`discount = $${cloudParamIndex++}`)
      cloudParams.push(data.discount)
      localUpdates.push('discount = ?')
      localParams.push(data.discount)
    }
    if (data.tax !== undefined) {
      cloudUpdates.push(`tax = $${cloudParamIndex++}`)
      cloudParams.push(data.tax)
      localUpdates.push('tax = ?')
      localParams.push(data.tax)
    }
    if (data.total !== undefined) {
      cloudUpdates.push(`total = $${cloudParamIndex++}`)
      cloudParams.push(data.total)
      localUpdates.push('total = ?')
      localParams.push(data.total)
    }
    if (data.paymentMethod !== undefined) {
      cloudUpdates.push(`payment_method = $${cloudParamIndex++}`)
      cloudParams.push(data.paymentMethod)
      localUpdates.push('payment_method = ?')
      localParams.push(data.paymentMethod)
    }
    if (data.paymentDeadline !== undefined) {
      cloudUpdates.push(`payment_deadline = $${cloudParamIndex++}`)
      cloudParams.push(data.paymentDeadline ? data.paymentDeadline : null)
      localUpdates.push('payment_deadline = ?')
      localParams.push(data.paymentDeadline ? data.paymentDeadline.getTime() : null)
    }
    if (data.customerId !== undefined) {
      cloudUpdates.push(`customer_id = $${cloudParamIndex++}`)
      cloudParams.push(data.customerId)
      localUpdates.push('customer_id = ?')
      localParams.push(data.customerId)
    }

    // Always update timestamp
    cloudUpdates.push(`updated_at = $${cloudParamIndex++}`)
    cloudParams.push(now)
    localUpdates.push('updated_at = ?')
    localParams.push(nowTs)

    // Add ID as last param
    cloudParams.push(id)
    localParams.push(id)

    // 3. Execute Header Updates
    if (cloudUpdates.length > 0 && pool) {
      try {
        await pool.query(
          `UPDATE transactions SET ${cloudUpdates.join(', ')} WHERE id = $${cloudParamIndex}`,
          cloudParams
        )
      } catch (error) {
        console.error('[TransactionService] update cloud error:', error)
        // If cloud fails, should we stop? For now, we continue to local to ensure consistency if possible,
        // or throw if strict consistency is needed.
        throw error
      }
    }

    if (localUpdates.length > 0) {
      this.db.run(`UPDATE transactions SET ${localUpdates.join(', ')} WHERE id = ?`, localParams)
    }

    // 4. Update Items & Inventory
    if (data.items) {
      const existingItems = existing.items ?? []
      const existingItemIds = new Set(existingItems.map((i) => i.id))
      const newItemIds = new Set(data.items.filter((i) => i.id).map((i) => i.id))

      // A. Handle Deleted Items (Reverse Inventory)
      for (const oldItem of existingItems) {
        if (!newItemIds.has(oldItem.id)) {
          // Reverse the inventory deduction (Add back to stock)
          if (this.stockTransactionService && this.productLocationService) {
            await this.stockTransactionService.create({
              productId: oldItem.productId,
              storeId: existing.storeId,
              type: 'ADJUSTMENT', // Using ADJUSTMENT to reverse the sale effect
              quantity: oldItem.quantity,
              reference: `CORRECTION_DEL:${existing.code}`,
              performedBy: existing.userId ?? undefined
            })
            await this.productLocationService.adjustQuantity(
              oldItem.productId,
              existing.storeId,
              oldItem.quantity // positive adds back
            )
          }
          
          if (pool) {
            await pool.query('DELETE FROM transaction_items WHERE id = $1', [oldItem.id])
          }
          this.db.run('DELETE FROM transaction_items WHERE id = ?', [oldItem.id])
        }
      }

      // B. Handle New & Updated Items
      for (const newItem of data.items) {
        if (newItem.id && existingItemIds.has(newItem.id)) {
          // --- UPDATE EXISTING ITEM ---
          const oldItem = existingItems.find((i) => i.id === newItem.id)
          if (oldItem) {
            // Check if Product Changed
            if (oldItem.productId !== newItem.productId) {
              // 1. Reverse OLD product (Add back old qty)
              if (this.stockTransactionService && this.productLocationService) {
                await this.stockTransactionService.create({
                  productId: oldItem.productId,
                  storeId: existing.storeId,
                  type: 'ADJUSTMENT',
                  quantity: oldItem.quantity,
                  reference: `CORRECTION_SWAP_OUT:${existing.code}`,
                  performedBy: existing.userId ?? undefined
                })
                await this.productLocationService.adjustQuantity(
                  oldItem.productId,
                  existing.storeId,
                  oldItem.quantity
                )

                // 2. Deduct NEW product (Subtract new qty)
                await this.stockTransactionService.create({
                  productId: newItem.productId,
                  storeId: existing.storeId,
                  type: 'SALE',
                  quantity: newItem.quantity,
                  reference: `CORRECTION_SWAP_IN:${existing.code}`,
                  performedBy: existing.userId ?? undefined
                })
                await this.productLocationService.adjustQuantity(
                  newItem.productId,
                  existing.storeId,
                  -newItem.quantity
                )
              }
            } else {
              // Same Product, Check Quantity Difference
              const qtyDiff = newItem.quantity - oldItem.quantity
              if (qtyDiff !== 0 && this.stockTransactionService && this.productLocationService) {
                await this.stockTransactionService.create({
                  productId: newItem.productId,
                  storeId: existing.storeId,
                  type: qtyDiff > 0 ? 'SALE' : 'ADJUSTMENT',
                  quantity: Math.abs(qtyDiff),
                  reference: `CORRECTION_QTY:${existing.code}`,
                  performedBy: existing.userId ?? undefined
                })
                await this.productLocationService.adjustQuantity(
                  newItem.productId,
                  existing.storeId,
                  -qtyDiff // negative checks out more, positive puts back
                )
              }
            }

            // Sync Update
            if (pool) {
              await pool.query(
                'UPDATE transaction_items SET product_id = $1, quantity = $2, display_quantity = $3, uom_code = $4, price = $5, updated_at = $6 WHERE id = $7',
                [
                  newItem.productId,
                  newItem.quantity,
                  newItem.displayQuantity ?? newItem.quantity,
                  newItem.uomCode ?? null,
                  newItem.price,
                  now,
                  newItem.id
                ]
              )
            }
            this.db.run(
              'UPDATE transaction_items SET product_id = ?, quantity = ?, display_quantity = ?, uom_code = ?, price = ?, updated_at = ? WHERE id = ?',
              [
                newItem.productId,
                newItem.quantity,
                newItem.displayQuantity ?? newItem.quantity,
                newItem.uomCode ?? null,
                newItem.price,
                nowTs,
                newItem.id
              ]
            )
          }
        } else {
          // --- ADD NEW ITEM ---
          const itemId = randomUUID()
          const displayQty = newItem.displayQuantity ?? newItem.quantity
          const uomCode = newItem.uomCode ?? null
          
          if (pool) {
            await pool.query(
              'INSERT INTO transaction_items (id, transaction_id, product_id, quantity, display_quantity, uom_code, price, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
              [
                itemId,
                id,
                newItem.productId,
                newItem.quantity,
                displayQty,
                uomCode,
                newItem.price,
                now,
                now
              ]
            )
          }
          this.db.run(
            'INSERT INTO transaction_items (id, transaction_id, product_id, quantity, display_quantity, uom_code, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              itemId,
              id,
              newItem.productId,
              newItem.quantity,
              displayQty,
              uomCode,
              newItem.price,
              nowTs,
              nowTs
            ]
          )

          // Deduct inventory for new item
          if (this.stockTransactionService && this.productLocationService) {
            await this.stockTransactionService.create({
              productId: newItem.productId,
              storeId: existing.storeId,
              type: 'SALE',
              quantity: newItem.quantity,
              reference: `CORRECTION_ADD:${existing.code}`,
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

    // 5. Verification: Fetch updated record
    // We fetch checks both (cloud preferably, falls back to local)
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
    if (!this.isOnline()) {
      throw new Error('Offline restore not supported')
    }

    try {
      const pool = getCloudDb().getPool()
      await pool.query('UPDATE transactions SET deleted_at = NULL, updated_at = NOW() WHERE id = $1', [id])
      
      const restored = await this.findById(id)
      if (!restored) {
        throw new Error('Transaction not found after restore')
      }
      return restored
    } catch (error) {
       console.error('[TransactionService] restore error:', error)
       throw error
    }
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
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        let query = `
          SELECT 
            COUNT(*) as count, 
            SUM(total) as revenue, 
            SUM(discount) as discount, 
            SUM(tax) as tax 
          FROM transactions 
          WHERE store_id = $1 AND deleted_at IS NULL
        `
        const params: any[] = [storeId]

        if (startDate) {
          query += ` AND created_at >= $${params.length + 1}`
          params.push(startDate.toISOString())
        }

        if (endDate) {
          query += ` AND created_at <= $${params.length + 1}`
          params.push(endDate.toISOString())
        }

        const result = await pool.query(query, params)
        const row = result.rows[0]

        // Fetch returns (refunds) from cloud
        let returnQuery = `
          SELECT SUM(total_refund) as total_refund 
          FROM transaction_return 
          WHERE store_id = $1 AND deleted_at IS NULL
        `
        const returnParams: any[] = [storeId]

        if (startDate) {
          returnQuery += ` AND created_at >= $${returnParams.length + 1}`
          returnParams.push(startDate.toISOString())
        }

        if (endDate) {
          returnQuery += ` AND created_at <= $${returnParams.length + 1}`
          returnParams.push(endDate.toISOString())
        }

        const returnResult = await pool.query(returnQuery, returnParams)
        const totalRefund = parseFloat(returnResult.rows[0].total_refund || '0')

        return {
          totalTransactions: parseInt(row.count),
          totalRevenue: String(parseFloat(row.revenue || '0') - totalRefund),
          totalDiscount: String(row.discount || '0'),
          totalTax: String(row.tax || '0')
        }

      } catch (error) {
        console.error('[TransactionService] getSalesSummary cloud error:', error)
        throw error // Strict Cloud Only: Do not fallback to local if online
      }
    }

    throw new Error('Offline mode not supported for sales summary')
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

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN created_at >= $1 THEN total ELSE 0 END), 0) as today_revenue,
            COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today_transactions,
            COALESCE(SUM(CASE WHEN created_at >= $2 THEN total ELSE 0 END), 0) as week_revenue,
            COUNT(CASE WHEN created_at >= $2 THEN 1 END) as week_transactions,
            COALESCE(SUM(CASE WHEN created_at >= $3 THEN total ELSE 0 END), 0) as month_revenue,
            COUNT(CASE WHEN created_at >= $3 THEN 1 END) as month_transactions
          FROM transactions 
          WHERE deleted_at IS NULL
        `, [todayStart.toISOString(), weekStart.toISOString(), monthStart.toISOString()])
        
        const row = result.rows[0]
        
        // Cloud Returns
        const returnResult = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE WHEN created_at >= $1 THEN total_refund ELSE 0 END), 0) as today_refund,
            COALESCE(SUM(CASE WHEN created_at >= $2 THEN total_refund ELSE 0 END), 0) as week_refund,
            COALESCE(SUM(CASE WHEN created_at >= $3 THEN total_refund ELSE 0 END), 0) as month_refund
          FROM transaction_return 
          WHERE deleted_at IS NULL
        `, [todayStart.toISOString(), weekStart.toISOString(), monthStart.toISOString()])

        const returnRow = returnResult.rows[0]

        // Cloud Counts
        const productCount = await pool.query('SELECT COUNT(*) as count FROM product WHERE deleted_at IS NULL AND is_active = true')
        const customerCount = await pool.query('SELECT COUNT(*) as count FROM customer WHERE deleted_at IS NULL')

        return {
          todayRevenue: parseFloat(row.today_revenue) - parseFloat(returnRow.today_refund),
          todayTransactions: parseInt(row.today_transactions),
          weekRevenue: parseFloat(row.week_revenue) - parseFloat(returnRow.week_refund),
          weekTransactions: parseInt(row.week_transactions),
          monthRevenue: parseFloat(row.month_revenue) - parseFloat(returnRow.month_refund),
          monthTransactions: parseInt(row.month_transactions),
          totalProducts: parseInt(productCount.rows[0].count),
          totalCustomers: parseInt(customerCount.rows[0].count),
          lowStockCount: 0 
        }

      } catch (error) {
        console.error('[TransactionService] getDashboardStats cloud error:', error)
        throw error // Strict Cloud Only: Do not fallback to local if online
      }
    }

    throw new Error('Offline mode not supported for dashboard stats')
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
    brokenGoods: number
  }> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const start = startDate.toISOString()
        const end = endDate.toISOString()

        let revenueQuery = `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as count FROM transactions WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`
        const revenueParams: any[] = [start, end]
        if (storeId) {
          revenueQuery += ` AND store_id = $3`
          revenueParams.push(storeId)
        }
        
        const revResult = await pool.query(revenueQuery, revenueParams)
        const revenue = parseFloat(revResult.rows[0].revenue)
        const count = parseInt(revResult.rows[0].count)

        // Deduct Returns from Revenue
        let returnQuery = `SELECT COALESCE(SUM(total_refund), 0) as refund FROM transaction_return WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2`
        const returnParams: any[] = [start, end]
        if (storeId) {
          returnQuery += ` AND store_id = $3`
          returnParams.push(storeId)
        }
        const retResult = await pool.query(returnQuery, returnParams)
        const totalRefund = parseFloat(retResult.rows[0].refund)
        
        const netRevenue = revenue - totalRefund

        // 2. Calculate COGS (HPP) from Stock Transactions (SALE type)
        // Cloud Query
        let cogsQuery = `
          SELECT SUM(
            st.quantity * COALESCE(
              b.cost,
              pp.cost,
              p.cost,
              0
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
            AND st.created_at >= $1 
            AND st.created_at <= $2
        `
        const cogsParams: any[] = [start, end]
        if (storeId) {
          cogsQuery += ` AND st.store_id = $3`
          cogsParams.push(storeId)
        }

        console.log(cogsParams)

        const cogsResult = await pool.query(cogsQuery, cogsParams)
        const cogs = parseFloat(cogsResult.rows[0].total_cogs || '0')

        // 3. Calculate Broken Goods (Waste) Value
        // Assuming 'WASTE' type is used for broken goods.
        // Value = quantity * cost
        const brokenGoods = await this.getBrokenGoodsSummary(startDate, endDate, storeId)
        
        const grossProfit = netRevenue - cogs
        const totalExpenses = brokenGoods // Add other expenses here if needed
        const netProfit = grossProfit - totalExpenses
        const margin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0

        return {
          revenue: netRevenue,
          cogs,
          grossProfit,
          margin,
          totalTransactions: count,
          brokenGoods
        }
      } catch (error) {
        console.error('[TransactionService] getProfitLossReport cloud error:', error)
        throw error // Strict Cloud Only: Do not fallback to local if online
      }
    }

    throw new Error('Offline mode not supported for profit/loss report')
  }

  /**
   * Get summary of broken goods (waste) value
   * Strict Cloud Only when online
   */
  async getBrokenGoodsSummary(startDate: Date, endDate: Date, storeId?: string): Promise<number> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const start = startDate.toISOString()
        const end = endDate.toISOString()

        let query = `
          SELECT COALESCE(SUM(CAST(total_loss AS REAL)), 0) as total_waste
          FROM damaged_goods
          WHERE deleted_at IS NULL 
            AND created_at >= $1 
            AND created_at <= $2
        `
        const params: any[] = [start, end]
        if (storeId) {
          query += ` AND store_id = $3`
          params.push(storeId)
        }

        const result = await pool.query(query, params)
        return parseFloat(result.rows[0].total_waste || '0')
      } catch (error) {
        console.error('[TransactionService] getBrokenGoodsSummary cloud error:', error)
        throw error
      }
    }

    throw new Error('Offline mode not supported for broken goods summary')
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
