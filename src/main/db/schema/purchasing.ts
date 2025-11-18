import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// PURCHASING MANAGEMENT
// PurchaseOrder, PurchaseOrderItem
////////////////////////////////////////////////////

export const purchaseOrderStatusEnum = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const

export const purchaseOrders = sqliteTable('purchase_order', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  supplierId: text('supplier_id').notNull(),
  storeId: text('store_id').notNull(),
  status: text('status', { enum: purchaseOrderStatusEnum }).notNull(),
  total: real('total').notNull().default(0),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const purchaseOrderItems = sqliteTable('purchase_order_item', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poId: text('po_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  cost: real('cost').notNull(),
  
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Relations
export const purchaseOrdersRelations = relations(purchaseOrders, ({ many }) => ({
  items: many(purchaseOrderItems),
  // supplier: one(suppliers, ...),
  // store: one(stores, ...),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  po: one(purchaseOrders, {
    fields: [purchaseOrderItems.poId],
    references: [purchaseOrders.id],
  }),
  // product: one(products, ...),
}))

// Types
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type PurchaseOrderStatus = typeof purchaseOrderStatusEnum[number]
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect
