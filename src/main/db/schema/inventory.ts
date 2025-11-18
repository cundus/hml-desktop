import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// INVENTORY MANAGEMENT
// ProductLocation, StockTransaction, StockAdjustment
////////////////////////////////////////////////////

export const productLocations = sqliteTable('product_location', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  location: text('location'),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

export const stockTransactionTypeEnum = [
  'INBOUND',
  'OUTBOUND',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'SALE',
] as const

export const stockTransactions = sqliteTable('stock_transaction', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  type: text('type', { enum: stockTransactionTypeEnum }).notNull(),
  quantity: integer('quantity').notNull(),
  reference: text('reference'),
  batchId: text('batch_id'),
  supplierId: text('supplier_id'),
  customerId: text('customer_id'),
  performedBy: text('performed_by').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

export const stockAdjustments = sqliteTable('stock_adjustment', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  difference: integer('difference').notNull(),
  note: text('note'),
  performedBy: text('performed_by').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

// Relations
export const productLocationsRelations = relations(productLocations, ({ one }) => ({
  // product: one(products, ...),
  // store: one(stores, ...),
}))

export const stockTransactionsRelations = relations(stockTransactions, ({ one }) => ({
  // product: one(products, ...),
  // store: one(stores, ...),
}))

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  // product: one(products, ...),
  // store: one(stores, ...),
}))

// Types
export type ProductLocation = typeof productLocations.$inferSelect
export type StockTransaction = typeof stockTransactions.$inferSelect
export type StockTransactionType = typeof stockTransactionTypeEnum[number]
export type StockAdjustment = typeof stockAdjustments.$inferSelect
