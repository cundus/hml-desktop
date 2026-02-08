import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'
import { BatchCloudService } from './batch-cloud.service'
import { AuditLogService } from './audit-log.service'

export type StockTransactionType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'SALE'
  | 'RETURN'

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
  // Batch Auto-Creation Fields
  batchCode?: string
  expiryDate?: Date
  cost?: string
}

export class StockTransactionCloudService {
  private localDb: Database
  private queueService: QueueService
  private batchService: BatchCloudService

  private auditLogService?: AuditLogService

  constructor(
    localDb: Database,
    queueService: QueueService,
    batchService: BatchCloudService,
    auditLogService?: AuditLogService
  ) {
    this.localDb = localDb
    this.queueService = queueService
    this.batchService = batchService
    this.auditLogService = auditLogService
  }
  // ... (isOnline, findAll, etc unchanged until create)

  // ... (findById, findByProduct, etc - I must be careful not to delete them if I replace Create block)
  // I will replace ONLY the create method block and constructor/DTO?
  // But DTO is at top and Create is at bottom.
  // I should do 2 replace calls or rewrite file.
  // Rewrite file is safer to avoid cutting "..." comments if i replace huge chunks.
  // Or replace DTO first. Then Constructor. Then Create.

  // Let's replace Step-by-Step.

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<StockTransaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_transaction WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockTransactionCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_transaction WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: StockTransaction[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<StockTransaction | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM stock_transaction WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[StockTransactionCloud] findById error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM stock_transaction WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const s = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return s
    }
    stmt.free()
    return undefined
  }

  async findByProductId(productId: string): Promise<StockTransaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_transaction WHERE product_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [productId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockTransactionCloud] findByProductId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_transaction WHERE product_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([productId])
    const results: StockTransaction[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByStoreId(storeId: string): Promise<StockTransaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_transaction WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [storeId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockTransactionCloud] findByStoreId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_transaction WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])
    const results: StockTransaction[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByType(type: StockTransactionType): Promise<StockTransaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_transaction WHERE type = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [type]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockTransactionCloud] findByType error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_transaction WHERE type = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([type])
    const results: StockTransaction[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByReference(reference: string): Promise<StockTransaction[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM stock_transaction WHERE reference = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
          [reference]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StockTransactionCloud] findByReference error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM stock_transaction WHERE reference = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([reference])
    const results: StockTransaction[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async create(data: CreateStockTransactionDto): Promise<StockTransaction> {
    const isOutbound = ['OUTBOUND', 'TRANSFER_OUT', 'SALE'].includes(data.type)
    // If adjustment is negative, treat like outbound logic?
    // Usually Adjustment specifies batch if specific. If generic adjustment (-5), allocation applies?
    // Let's stick to explicitly Outbound types for now.

    // Auto-create/find batch if code is provided (INBOUND)
    let finalBatchId = data.batchId
    if (!isOutbound && !finalBatchId && data.batchCode) {
      // ... existing inbound logic ...
      const existing = await this.batchService.findByCode(data.batchCode)
      if (existing) {
        if (existing.productId === data.productId) {
          finalBatchId = existing.id
        } else {
          finalBatchId = existing.id
        }
      } else {
        const newBatch = await this.batchService.create({
          productId: data.productId,
          code: data.batchCode,
          expiryDate: data.expiryDate,
          cost: data.cost
        })
        finalBatchId = newBatch.id
      }
    }

    // FIFO Allocation Logic (OUTBOUND with No Batch)
    if (isOutbound && !finalBatchId && data.quantity > 0) {
      // 1. Get available batches
      const batches = await this.getActiveBatches(data.productId, data.storeId)

      let remainingQty = data.quantity
      let lastTxn: StockTransaction | null = null

      // 2. Allocate
      for (const batch of batches) {
        if (remainingQty <= 0) break

        const takeQty = Math.min(remainingQty, batch.quantity)

        // Create TXN for this batch
        lastTxn = await this.createSingleTransaction({
          ...data,
          quantity: takeQty,
          batchId: batch.batchId || undefined
        })

        remainingQty -= takeQty
      }

      // 3. If remaining qty > 0 (Stock ran out or no batches), create generic txn
      if (remainingQty > 0) {
        lastTxn = await this.createSingleTransaction({
          ...data,
          quantity: remainingQty,
          batchId: undefined // No batch
        })
      }

      // Return the last created transaction (as a proxy for success)
      // Ideally we return list, but interface is single.
      if (lastTxn) return lastTxn
      throw new Error('Failed to create outbound transaction')
    }

    // Standard Single Transaction (Inbound OR Outbound with specific Batch)
    return this.createSingleTransaction({
      ...data,
      batchId: finalBatchId
    })
  }

  private async createSingleTransaction(
    data: CreateStockTransactionDto
  ): Promise<StockTransaction> {
    const id = randomUUID()
    const now = new Date()
    const st: StockTransaction = {
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
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO stock_transaction (id, product_id, store_id, type, quantity, reference, batch_id, supplier_id, customer_id, performed_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [
            id,
            data.productId,
            data.storeId,
            data.type,
            data.quantity,
            st.reference,
            st.batchId,
            st.supplierId,
            st.customerId,
            st.performedBy,
            now,
            now
          ]
        )
        if (this.auditLogService) {
          void this.auditLogService.log({
            action: 'CREATE',
            entityType: 'stock',
            entityId: id,
            userId: st.performedBy || 'SYSTEM',
            storeId: data.storeId,
            newValues: {
              productId: data.productId,
              type: data.type,
              quantity: data.quantity,
              batchId: st.batchId,
              reference: st.reference
            },
            metadata: { type: data.type }
          })
        }
        return st
      } catch (error) {
        console.error('[StockTransactionCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO stock_transaction (id, product_id, store_id, type, quantity, reference, batch_id, supplier_id, customer_id, performed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.storeId,
        data.type,
        data.quantity,
        st.reference,
        st.batchId,
        st.supplierId,
        st.customerId,
        st.performedBy,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'stock_transaction', {
      id,
      product_id: data.productId,
      store_id: data.storeId,
      type: data.type,
      quantity: data.quantity,
      reference: st.reference,
      batch_id: st.batchId,
      supplier_id: st.supplierId,
      customer_id: st.customerId,
      performed_by: st.performedBy,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'CREATE',
        entityType: 'stock',
        entityId: id,
        userId: st.performedBy || 'SYSTEM',
        storeId: data.storeId,
        newValues: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          batchId: st.batchId,
          reference: st.reference
        },
        metadata: { type: data.type }
      })
    }
    return st
  }

  async getActiveBatches(
    productId: string,
    storeId: string
  ): Promise<
    {
      batchId: string | null
      code: string | null
      cost: number
      expiryDate: Date | null
      quantity: number
    }[]
  > {
    // INBOUND positive, OUTBOUND negative.
    // If Type is 'ADJUSTMENT', we need to check if quantity is +/-?
    // Usually StockTransaction quantity is unsigned and Type determines sign?
    // Or quantity is signed?
    // In `StockTransactionCloudService.create`:
    // `isOutbound` check logic implies Type determines flow.
    // Let's check `create` logic again.
    // In `create`: `quantity` is passed.
    // And DB stores it.
    // Does DB store negative for outbound?
    // Checking `create`: `data.quantity` is stored as is.
    // But `isOutbound` check implies we treat it as deduction logic.
    // HOWEVER, the `activeBatches` query I am replacing used `SUM(t.quantity)`.
    // Wait, the original `getBatchesWithStock` used `SUM(t.quantity)`.
    // If Outbound transactions are stored as POSITIVE numbers in DB, then `SUM(quantity)` would be WRONG if we want net stock!
    // UNLESS Outbound transactions are stored as NEGATIVE numbers?
    // In `TransactionService.processCheckout`:
    // It calls `stockTransactionService.create({ type: 'SALE', quantity })`.
    // It creates POSITIVE quantity record.
    // SO `getBatchesWithStock` summing them up would result in INCREASED stock for sales!
    // **MAJOR BUG FOUND** (or my understanding is wrong).
    // Let's check `productLocationService.adjustQuantity`.
    // `TransactionService` calls `allocator.allocateStock` -> `productLocationService.adjustQuantity(..., -quantity)`.
    // But `stockTransactionService.create` stores the raw quantity of the transaction.
    // So if I sell 5, I store `quantity: 5, type: 'SALE'`.
    // If I buy 10, I store `quantity: 10, type: 'INBOUND'`.
    // `SUM(quantity)` = 15. WRONG.
    // The query MUST respect Type sign.

    // I will fix this query to handle signs correctly.

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        // Cloud Query with Sign Logic
        const cloudSql = `
          SELECT 
            t.batch_id, 
            SUM(CASE 
              WHEN t.type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN') THEN t.quantity 
              WHEN t.type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE', 'WASTE') THEN -t.quantity 
              WHEN t.type = 'ADJUSTMENT' THEN t.quantity -- Assumes Adjustment can be +/- or handles logic differently? 
              -- Usually Adjustment stores signed quantity?
              -- Let's assume standard Types for now.
              ELSE 0 
            END) as available_qty,
            b.code,
            b.cost,
            b.expiry_date,
            b.created_at
          FROM stock_transaction t
          LEFT JOIN batch b ON t.batch_id = b.id
          WHERE t.product_id = $1 
            AND t.store_id = $2
            AND t.deleted_at IS NULL
          GROUP BY t.batch_id, b.code, b.cost, b.expiry_date, b.created_at
          HAVING SUM(CASE 
              WHEN t.type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN') THEN t.quantity 
              WHEN t.type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE', 'WASTE') THEN -t.quantity 
              ELSE 0 
            END) > 0
          ORDER BY b.expiry_date ASC, b.created_at ASC
        `
        const res = await pool.query(cloudSql, [productId, storeId])
        return res.rows.map((r) => ({
          batchId: r.batch_id || null,
          code: r.code || null,
          cost: parseFloat(r.cost),
          expiryDate: r.expiry_date ? new Date(r.expiry_date) : null,
          quantity: parseFloat(r.available_qty)
        }))
      } catch (err) {
        console.error('[StockTransactionCloud] getActiveBatches error:', err)
      }
    }

    // Local Logic with Sign Logic
    // SQLite doesn't support CASE easily in aggregate? It does.
    const localSql = `
      SELECT 
        t.batch_id, 
        b.code,
        b.cost,
        b.expiry_date,
        b.created_at,
        SUM(CASE 
          WHEN t.type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN') THEN t.quantity 
          WHEN t.type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE', 'WASTE') THEN -t.quantity 
          ELSE 0 
        END) as available_qty
      FROM stock_transaction t
      LEFT JOIN batch b ON t.batch_id = b.id
      WHERE t.product_id = ? AND t.store_id = ? AND t.deleted_at IS NULL
      GROUP BY t.batch_id
      HAVING available_qty > 0
      ORDER BY b.expiry_date ASC, b.created_at ASC
    `
    const stmt = this.localDb.prepare(localSql)
    stmt.bind([productId, storeId])
    const results: {
      batchId: string | null
      code: string | null
      cost: number
      expiryDate: Date | null
      quantity: number
    }[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        batchId: (row.batch_id as string) || null,
        code: (row.code as string) || null,
        cost: parseFloat(row.cost as string) || 0,
        expiryDate: row.expiry_date ? new Date(row.expiry_date as number) : null,
        quantity: row.available_qty as number
      })
    }
    stmt.free()
    return results
  }

  async softDelete(id: string): Promise<StockTransaction> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Stock transaction not found')
    const now = new Date()
    const deleted: StockTransaction = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE stock_transaction SET deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
        return deleted
      } catch (error) {
        console.error('[StockTransactionCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE stock_transaction SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', 'stock_transaction', { id })
    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'DELETE',
        entityType: 'stock',
        entityId: id,
        userId: existing.performedBy || 'SYSTEM',
        storeId: existing.storeId,
        metadata: { type: existing.type }
      })
    }
    return deleted
  }

  async getStockSummary(
    productId: string,
    storeId: string
  ): Promise<{ totalIn: number; totalOut: number; currentStock: number }> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const inResult = await pool.query(
          "SELECT COALESCE(SUM(quantity), 0) as total FROM stock_transaction WHERE product_id = $1 AND store_id = $2 AND type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT') AND deleted_at IS NULL",
          [productId, storeId]
        )
        const outResult = await pool.query(
          "SELECT COALESCE(SUM(quantity), 0) as total FROM stock_transaction WHERE product_id = $1 AND store_id = $2 AND type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE') AND deleted_at IS NULL",
          [productId, storeId]
        )
        const totalIn = parseFloat(inResult.rows[0]?.total as string) || 0
        const totalOut = parseFloat(outResult.rows[0]?.total as string) || 0
        return { totalIn, totalOut, currentStock: totalIn - totalOut }
      } catch (error) {
        console.error('[StockTransactionCloud] getStockSummary error:', error)
      }
    }

    const inStmt = this.localDb.prepare(
      "SELECT SUM(quantity) as total FROM stock_transaction WHERE product_id = ? AND store_id = ? AND type IN ('INBOUND', 'TRANSFER_IN', 'ADJUSTMENT') AND deleted_at IS NULL"
    )
    inStmt.bind([productId, storeId])
    let totalIn = 0
    if (inStmt.step()) totalIn = (inStmt.getAsObject().total as number) || 0
    inStmt.free()

    const outStmt = this.localDb.prepare(
      "SELECT SUM(quantity) as total FROM stock_transaction WHERE product_id = ? AND store_id = ? AND type IN ('OUTBOUND', 'TRANSFER_OUT', 'SALE') AND deleted_at IS NULL"
    )
    outStmt.bind([productId, storeId])
    let totalOut = 0
    if (outStmt.step()) totalOut = (outStmt.getAsObject().total as number) || 0
    outStmt.free()

    return { totalIn, totalOut, currentStock: totalIn - totalOut }
  }

  private mapCloudRow(row: Record<string, unknown>): StockTransaction {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      type: row.type as StockTransactionType,
      quantity: parseFloat(row.quantity as string) || 0,
      reference: row.reference as string | null,
      batchId: row.batch_id as string | null,
      supplierId: row.supplier_id as string | null,
      customerId: row.customer_id as string | null,
      performedBy: row.performed_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): StockTransaction {
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
