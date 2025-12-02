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

export class PurchaseOrderService {
  constructor(private db: Database) {}

  /**
   * Get all purchase orders
   */
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
  async update(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const now = Date.now()

    const fields: string[] = ['status = ?', 'updated_at = ?']
    const values: any[] = [data.status, now]

    if (data.total !== undefined) {
      fields.unshift('total = ?')
      values.unshift(data.total)
    }

    values.push(id)

    this.db.run(`UPDATE purchase_order SET ${fields.join(', ')} WHERE id = ?`, values)

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Purchase order not found after update')
    }
    return updated
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
