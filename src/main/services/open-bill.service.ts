import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'

// ── Types ──────────────────────────────────────────────────────

export interface OpenBill {
  id: string
  label: string | null
  storeId: string
  shiftId: string
  customerId: string | null
  salesId: string | null
  salesName: string | null
  subtotal: string
  discount: string
  total: string
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  items?: OpenBillItem[]
}

export interface OpenBillItem {
  id: string
  openBillId: string
  productId: string
  cartItemId: string
  quantity: number
  displayQuantity: number | null
  uomCode: string | null
  uomId: string | null
  priceCategoryId: string | null
  priceCategoryName: string | null
  conversionFactor: number
  baseQuantity: number
  productName: string | null
  productSku: string | null
  unitPrice: string
  weight: string
  createdAt: Date
}

export interface CreateOpenBillDto {
  label?: string
  storeId: string
  shiftId: string
  customerId?: string
  salesId?: string
  salesName?: string
  subtotal: string
  discount: string
  total: string
  notes?: string
  createdBy?: string
  items: CreateOpenBillItemDto[]
}

export interface CreateOpenBillItemDto {
  productId: string
  cartItemId: string
  quantity: number
  displayQuantity?: number
  uomCode?: string
  uomId?: string
  priceCategoryId?: string
  priceCategoryName?: string
  conversionFactor: number
  baseQuantity: number
  productName?: string
  productSku?: string
  unitPrice: string
  weight?: string
}

// ── Service ────────────────────────────────────────────────────

export class OpenBillService {
  constructor(private db: Database) {}

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: CreateOpenBillDto): Promise<OpenBill> {
    const id = randomUUID()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // 1. Insert into local SQLite
    this.db.run(
      `INSERT INTO open_bill (id, label, store_id, shift_id, customer_id, sales_id, sales_name, subtotal, discount, total, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.label ?? null,
        data.storeId,
        data.shiftId,
        data.customerId ?? null,
        data.salesId ?? null,
        data.salesName ?? null,
        data.subtotal,
        data.discount,
        data.total,
        data.notes ?? null,
        data.createdBy ?? null,
        now,
        now
      ]
    )

    // 2. Insert items locally
    for (const item of data.items) {
      const itemId = randomUUID()
      this.db.run(
        `INSERT INTO open_bill_item (id, open_bill_id, product_id, cart_item_id, quantity, display_quantity, uom_code, uom_id, price_category_id, price_category_name, conversion_factor, base_quantity, product_name, product_sku, unit_price, weight, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          id,
          item.productId,
          item.cartItemId,
          item.quantity,
          item.displayQuantity ?? item.quantity,
          item.uomCode ?? null,
          item.uomId ?? null,
          item.priceCategoryId ?? null,
          item.priceCategoryName ?? null,
          item.conversionFactor,
          item.baseQuantity,
          item.productName ?? null,
          item.productSku ?? null,
          item.unitPrice,
          item.weight ?? '0',
          now
        ]
      )
    }

    saveDb(this.db)

    // 3. Insert into cloud if online
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `INSERT INTO open_bill (id, label, store_id, shift_id, customer_id, sales_id, sales_name, subtotal, discount, total, notes, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            id,
            data.label ?? null,
            data.storeId,
            data.shiftId,
            data.customerId ?? null,
            data.salesId ?? null,
            data.salesName ?? null,
            data.subtotal,
            data.discount,
            data.total,
            data.notes ?? null,
            data.createdBy ?? null,
            nowIso,
            nowIso
          ]
        )

        for (const item of data.items) {
          const cloudItemId = randomUUID()
          await pool.query(
            `INSERT INTO open_bill_item (id, open_bill_id, product_id, cart_item_id, quantity, display_quantity, uom_code, uom_id, price_category_id, price_category_name, conversion_factor, base_quantity, product_name, product_sku, unit_price, weight, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
              cloudItemId,
              id,
              item.productId,
              item.cartItemId,
              item.quantity,
              item.displayQuantity ?? item.quantity,
              item.uomCode ?? null,
              item.uomId ?? null,
              item.priceCategoryId ?? null,
              item.priceCategoryName ?? null,
              item.conversionFactor,
              item.baseQuantity,
              item.productName ?? null,
              item.productSku ?? null,
              item.unitPrice,
              item.weight ?? '0',
              nowIso
            ]
          )
        }
      } catch (error) {
        console.warn('[OpenBillService] Cloud insert failed, will rely on local:', error)
      }
    }

    return this.findById(id) as Promise<OpenBill>
  }

  // ── Read ─────────────────────────────────────────────────────

  async findByShiftId(shiftId: string): Promise<OpenBill[]> {
    // Cloud-first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT * FROM open_bill WHERE shift_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
          [shiftId]
        )
        return (result.rows ?? []).map(this.mapCloudRow)
      } catch (error) {
        console.warn('[OpenBillService] Cloud query failed, falling back to local:', error)
      }
    }

    // Local fallback
    return this.findByShiftIdLocal(shiftId)
  }

  private findByShiftIdLocal(shiftId: string): OpenBill[] {
    const stmt = this.db.prepare(
      `SELECT * FROM open_bill WHERE shift_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
    )
    stmt.bind([shiftId])

    const bills: OpenBill[] = []
    while (stmt.step()) {
      bills.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return bills
  }

  async findByStoreId(storeId: string): Promise<OpenBill[]> {
    // Cloud-first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT * FROM open_bill WHERE store_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
          [storeId]
        )
        return (result.rows ?? []).map(this.mapCloudRow)
      } catch (error) {
        console.warn('[OpenBillService] Cloud query failed, falling back to local:', error)
      }
    }

    // Local fallback
    const stmt = this.db.prepare(
      `SELECT * FROM open_bill WHERE store_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
    )
    stmt.bind([storeId])

    const bills: OpenBill[] = []
    while (stmt.step()) {
      bills.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return bills
  }

  async findById(id: string): Promise<OpenBill | undefined> {
    let bill: OpenBill | undefined

    // Cloud-first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT * FROM open_bill WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        )
        if (result.rows && result.rows.length > 0) {
          bill = this.mapCloudRow(result.rows[0])
        }
      } catch (error) {
        console.warn('[OpenBillService] Cloud query failed, falling back to local:', error)
      }
    }

    // Local fallback
    if (!bill) {
      const stmt = this.db.prepare(
        `SELECT * FROM open_bill WHERE id = ? AND deleted_at IS NULL`
      )
      stmt.bind([id])
      if (stmt.step()) {
        bill = this.mapLocalRow(stmt.getAsObject())
      }
      stmt.free()
    }

    if (!bill) return undefined

    // Fetch items
    bill.items = await this.findItemsByBillId(id)
    return bill
  }

  private async findItemsByBillId(billId: string): Promise<OpenBillItem[]> {
    // Cloud-first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT * FROM open_bill_item WHERE open_bill_id = $1 ORDER BY created_at ASC`,
          [billId]
        )
        return (result.rows ?? []).map(this.mapCloudItemRow)
      } catch (error) {
        console.warn('[OpenBillService] Cloud item query failed, falling back to local:', error)
      }
    }

    // Local fallback
    const stmt = this.db.prepare(
      `SELECT * FROM open_bill_item WHERE open_bill_id = ? ORDER BY created_at ASC`
    )
    stmt.bind([billId])

    const items: OpenBillItem[] = []
    while (stmt.step()) {
      items.push(this.mapLocalItemRow(stmt.getAsObject()))
    }
    stmt.free()
    return items
  }

  // ── Delete ───────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Soft-delete locally
    this.db.run(
      `UPDATE open_bill SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    )
    saveDb(this.db)

    // Soft-delete on cloud
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `UPDATE open_bill SET deleted_at = $1, updated_at = $2 WHERE id = $3`,
          [nowIso, nowIso, id]
        )
      } catch (error) {
        console.warn('[OpenBillService] Cloud delete failed:', error)
      }
    }
  }

  async deleteByShiftId(shiftId: string): Promise<void> {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Soft-delete all open bills for this shift locally
    this.db.run(
      `UPDATE open_bill SET deleted_at = ?, updated_at = ? WHERE shift_id = ? AND deleted_at IS NULL`,
      [now, now, shiftId]
    )
    saveDb(this.db)

    // Soft-delete on cloud
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          `UPDATE open_bill SET deleted_at = $1, updated_at = $2 WHERE shift_id = $3 AND deleted_at IS NULL`,
          [nowIso, nowIso, shiftId]
        )
      } catch (error) {
        console.warn('[OpenBillService] Cloud deleteByShiftId failed:', error)
      }
    }
  }

  // ── Count (for badge) ────────────────────────────────────────

  async countByShiftId(shiftId: string): Promise<number> {
    // Cloud-first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          `SELECT COUNT(*)::int as count FROM open_bill WHERE shift_id = $1 AND deleted_at IS NULL`,
          [shiftId]
        )
        return result.rows?.[0]?.count ?? 0
      } catch (error) {
        console.warn('[OpenBillService] Cloud count failed, falling back to local:', error)
      }
    }

    // Local fallback
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM open_bill WHERE shift_id = ? AND deleted_at IS NULL`
    )
    stmt.bind([shiftId])
    let count = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      count = Number(row.count) || 0
    }
    stmt.free()
    return count
  }

  // ── Mapping helpers ──────────────────────────────────────────

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapLocalRow(row: any): OpenBill {
    return {
      id: row.id,
      label: row.label ?? null,
      storeId: row.store_id,
      shiftId: row.shift_id,
      customerId: row.customer_id ?? null,
      salesId: row.sales_id ?? null,
      salesName: row.sales_name ?? null,
      subtotal: row.subtotal ?? '0',
      discount: row.discount ?? '0',
      total: row.total ?? '0',
      notes: row.notes ?? null,
      createdBy: row.created_by ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
    }
  }

  private mapCloudRow(row: any): OpenBill {
    return {
      id: row.id,
      label: row.label ?? null,
      storeId: row.store_id,
      shiftId: row.shift_id,
      customerId: row.customer_id ?? null,
      salesId: row.sales_id ?? null,
      salesName: row.sales_name ?? null,
      subtotal: row.subtotal ?? '0',
      discount: row.discount ?? '0',
      total: row.total ?? '0',
      notes: row.notes ?? null,
      createdBy: row.created_by ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null
    }
  }

  private mapLocalItemRow(row: any): OpenBillItem {
    return {
      id: row.id,
      openBillId: row.open_bill_id,
      productId: row.product_id,
      cartItemId: row.cart_item_id,
      quantity: Number(row.quantity),
      displayQuantity: row.display_quantity != null ? Number(row.display_quantity) : null,
      uomCode: row.uom_code ?? null,
      uomId: row.uom_id ?? null,
      priceCategoryId: row.price_category_id ?? null,
      priceCategoryName: row.price_category_name ?? null,
      conversionFactor: Number(row.conversion_factor) || 1,
      baseQuantity: Number(row.base_quantity),
      productName: row.product_name ?? null,
      productSku: row.product_sku ?? null,
      unitPrice: row.unit_price,
      weight: row.weight ?? '0',
      createdAt: new Date(row.created_at)
    }
  }

  private mapCloudItemRow(row: any): OpenBillItem {
    return {
      id: row.id,
      openBillId: row.open_bill_id,
      productId: row.product_id,
      cartItemId: row.cart_item_id,
      quantity: Number(row.quantity),
      displayQuantity: row.display_quantity != null ? Number(row.display_quantity) : null,
      uomCode: row.uom_code ?? null,
      uomId: row.uom_id ?? null,
      priceCategoryId: row.price_category_id ?? null,
      priceCategoryName: row.price_category_name ?? null,
      conversionFactor: Number(row.conversion_factor) || 1,
      baseQuantity: Number(row.base_quantity),
      productName: row.product_name ?? null,
      productSku: row.product_sku ?? null,
      unitPrice: row.unit_price,
      weight: row.weight ?? '0',
      createdAt: new Date(row.created_at)
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
