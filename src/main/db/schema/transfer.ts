import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// STORE TRANSFER MANAGEMENT
// TransferRequest, TransferItem
////////////////////////////////////////////////////

export const transferRequests = sqliteTable('transfer_request', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text('source_id').notNull(),
  destinationId: text('destination_id').notNull(),
  reference: text('reference').notNull().unique(),
  note: text('note'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

export const transferItems = sqliteTable('transfer_item', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  transferId: text('transfer_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Relations
export const transferRequestsRelations = relations(transferRequests, ({ many }) => ({
  items: many(transferItems),
  // source: one(stores, ...),
  // destination: one(stores, ...),
}))

export const transferItemsRelations = relations(transferItems, ({ one }) => ({
  transfer: one(transferRequests, {
    fields: [transferItems.transferId],
    references: [transferRequests.id],
  }),
  // product: one(products, ...),
}))

// Types
export type TransferRequest = typeof transferRequests.$inferSelect
export type TransferItem = typeof transferItems.$inferSelect
