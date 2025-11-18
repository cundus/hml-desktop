import { pgTable, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'

// PURCHASING: PurchaseOrder, PurchaseOrderItem

export const purchaseOrderStatusEnum = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const

export const purchaseOrders = pgTable('purchase_order', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  supplierId: text('supplier_id').notNull(),
  storeId: text('store_id').notNull(),
  status: text('status').notNull(),
  total: numeric('total').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})

export const purchaseOrderItems = pgTable('purchase_order_item', {
  id: text('id').primaryKey(),
  poId: text('po_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  cost: numeric('cost').notNull(),

  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})
