import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

// TRANSFER: TransferRequest, TransferItem

export const transferRequests = pgTable('transfer_request', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull(),
  destinationId: text('destination_id').notNull(),
  reference: text('reference').notNull(),
  note: text('note'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const transferItems = pgTable('transfer_item', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),

  deletedAt: timestamp('deleted_at', { withTimezone: false })
})
