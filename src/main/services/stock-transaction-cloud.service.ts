import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

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

export class StockTransactionCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }
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
    return st
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
