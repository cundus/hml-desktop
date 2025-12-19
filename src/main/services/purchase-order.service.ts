import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrder {
  id: string
  code: string
  supplierId: string
  storeId: string
  status: PurchaseOrderStatus
  total: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  poId: string
  productId: string
  quantity: number
  cost: string
  createdAt: Date
  updatedAt: Date
}

export interface CreatePurchaseOrderDto {
  code: string
  supplierId: string
  storeId: string
  status?: PurchaseOrderStatus
  total: string
  items: CreatePurchaseOrderItemDto[]
}

export interface CreatePurchaseOrderItemDto {
  productId: string
  quantity: number
  cost: string
}

export interface UpdatePurchaseOrderDto {
  status: PurchaseOrderStatus
  total?: string
}

import { StockTransactionService } from './stock-transaction.service'
import { ProductLocationService } from './product-location.service'

export class PurchaseOrderService {
  constructor(
    private db: Database,
    private stockTransactionService?: StockTransactionService,
    private productLocationService?: ProductLocationService
  ) {}

  // ... (Rest of existing methods)

  /**
   * Receive purchase order
   * This action is irreversible. It will update the status to RECEIVED and increase inventory.
   */
  async receiveOrder(id: string): Promise<PurchaseOrder> {
    const po = await this.findById(id)
    if (!po) {
      throw new Error('Purchase order not found')
    }

    if (po.status !== 'ORDERED') {
      throw new Error('Can only receive orders with ORDERED status')
    }

    if (!po.items || po.items.length === 0) {
      throw new Error('Cannot receive order with no items')
    }

    // Use synchronous transaction to prevent event loop interleaving
    try {
      this.db.exec('SAVEPOINT receive_order')
      const now = Date.now()

      // 1. Update PO status
      this.db.run('UPDATE purchase_order SET status = ?, updated_at = ? WHERE id = ?', [
        'RECEIVED',
        now,
        id
      ])

      // 2. Update inventory and create stock transactions
      for (const item of po.items) {
        // A. Create stock transaction (Optimized inlining)
        const transId = randomUUID()
        this.db.run(
          'INSERT INTO stock_transaction (id, product_id, store_id, type, quantity, reference, batch_id, supplier_id, customer_id, performed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            transId,
            item.productId,
            po.storeId,
            'INBOUND',
            item.quantity,
            po.code,
            null, // batchId
            po.supplierId,
            null, // customerId
            'SYSTEM',
            now,
            now
          ]
        )

        // B. Update product location (Optimized inlining)
        // Check if location exists
        const stmt = this.db.prepare(
          'SELECT id, quantity, reserved_quantity FROM product_location WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL'
        )
        stmt.bind([item.productId, po.storeId])

        if (stmt.step()) {
          // Update existing
          const row = stmt.getAsObject()
          const locId = row.id as string
          const currentQty = row.quantity as number
          const newQty = currentQty + item.quantity

          this.db.run('UPDATE product_location SET quantity = ?, updated_at = ? WHERE id = ?', [
            newQty,
            now,
            locId
          ])
        } else {
          // Create new
          const locId = randomUUID()
          this.db.run(
            'INSERT INTO product_location (id, product_id, store_id, quantity, reserved_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [locId, item.productId, po.storeId, item.quantity, 0, now, now]
          )
        }
        stmt.free()
      }

      this.db.exec('RELEASE receive_order')
    } catch (error) {
      try {
        this.db.exec('ROLLBACK TO receive_order')
      } catch (e) {
        console.error('Failed to rollback savepoint:', e)
      }
      throw error
    }

    // Save and return result outside transaction block
    try {
      saveDb(this.db)
      const updated = await this.findById(id)
      if (!updated) throw new Error('Failed to retrieve updated PO')
      return updated
    } catch (error) {
      console.error('Post-transaction error:', error)
      throw error
    }
  }

  async findAll(): Promise<PurchaseOrder[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: PurchaseOrder[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      results.push(po)
    }
    stmt.free()

    return results
  }

  /**
   * Get purchase order by ID
   */
  async findById(id: string): Promise<PurchaseOrder | undefined> {
    const stmt = this.db.prepare('SELECT * FROM purchase_order WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      return po
    }
    stmt.free()
    return undefined
  }

  /**
   * Get purchase order by code
   */
  async findByCode(code: string): Promise<PurchaseOrder | undefined> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order WHERE code = ? AND deleted_at IS NULL'
    )
    stmt.bind([code])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      return po
    }
    stmt.free()
    return undefined
  }

  /**
   * Get purchase orders by supplier ID
   */
  async findBySupplierId(supplierId: string): Promise<PurchaseOrder[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order WHERE supplier_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([supplierId])

    const results: PurchaseOrder[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      results.push(po)
    }
    stmt.free()

    return results
  }

  /**
   * Get purchase orders by store ID
   */
  async findByStoreId(storeId: string): Promise<PurchaseOrder[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([storeId])

    const results: PurchaseOrder[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      results.push(po)
    }
    stmt.free()

    return results
  }

  /**
   * Get purchase orders by status
   */
  async findByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order WHERE status = ? AND deleted_at IS NULL ORDER BY created_at DESC'
    )
    stmt.bind([status])

    const results: PurchaseOrder[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      const po = this.mapRowToPurchaseOrder(row)
      po.items = await this.findItemsByPoId(po.id)
      results.push(po)
    }
    stmt.free()

    return results
  }

  /**
   * Get purchase order items by PO ID
   */
  async findItemsByPoId(poId: string): Promise<PurchaseOrderItem[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM purchase_order_item WHERE po_id = ? ORDER BY created_at ASC'
    )
    stmt.bind([poId])

    const results: PurchaseOrderItem[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToPurchaseOrderItem(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new purchase order with items
   */
  async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const id = randomUUID()
    const now = Date.now()

    // Insert purchase order
    this.db.run(
      'INSERT INTO purchase_order (id, code, supplier_id, store_id, status, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.code, data.supplierId, data.storeId, data.status ?? 'DRAFT', data.total, now, now]
    )

    // Insert purchase order items
    for (const item of data.items) {
      const itemId = randomUUID()
      this.db.run(
        'INSERT INTO purchase_order_item (id, po_id, product_id, quantity, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, id, item.productId, item.quantity, item.cost, now, now]
      )
    }

    saveDb(this.db)

    const created = await this.findById(id)
    if (!created) {
      throw new Error('Purchase order not found after creation')
    }
    return created
  }

  /**
   * Update purchase order
   */
  async update(
    id: string,
    data: UpdatePurchaseOrderDto & { items?: CreatePurchaseOrderItemDto[] }
  ): Promise<PurchaseOrder> {
    const now = Date.now()

    try {
      this.db.exec('BEGIN TRANSACTION')

      // 1. Update PO fields
      const fields: string[] = ['status = ?', 'updated_at = ?']
      const values: any[] = [data.status, now]

      if (data.total !== undefined) {
        fields.unshift('total = ?')
        values.unshift(data.total)
      }

      values.push(id)

      this.db.run(`UPDATE purchase_order SET ${fields.join(', ')} WHERE id = ?`, values)

      // 2. Update items if provided
      if (data.items) {
        // Delete existing items
        this.db.run('DELETE FROM purchase_order_item WHERE po_id = ?', [id])

        // Insert new items
        for (const item of data.items) {
          const itemId = randomUUID()
          this.db.run(
            'INSERT INTO purchase_order_item (id, po_id, product_id, quantity, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [itemId, id, item.productId, item.quantity, item.cost, now, now]
          )
        }
      }

      this.db.exec('COMMIT')
      saveDb(this.db)

      const updated = await this.findById(id)
      if (!updated) {
        throw new Error('Purchase order not found after update')
      }
      return updated
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /**
   * Soft delete purchase order
   */
  async softDelete(id: string): Promise<PurchaseOrder> {
    const now = Date.now()

    this.db.run('UPDATE purchase_order SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Purchase order not found after delete')
    }
    return deleted
  }

  /**
   * Map database row to PurchaseOrder object
   */
  private mapRowToPurchaseOrder(row: any): PurchaseOrder {
    return {
      id: row.id as string,
      code: row.code as string,
      supplierId: row.supplier_id as string,
      storeId: row.store_id as string,
      status: row.status as PurchaseOrderStatus,
      total: row.total as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }

  /**
   * Map database row to PurchaseOrderItem object
   */
  private mapRowToPurchaseOrderItem(row: any): PurchaseOrderItem {
    return {
      id: row.id as string,
      poId: row.po_id as string,
      productId: row.product_id as string,
      quantity: row.quantity as number,
      cost: row.cost as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number)
    }
  }
}
