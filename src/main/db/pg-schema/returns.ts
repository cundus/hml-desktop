import { pgTable, text, timestamp, boolean, numeric } from 'drizzle-orm/pg-core'
import { transactions, transactionItems } from './sales'

export const transactionReturn = pgTable('transaction_return', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id),
  returnNumber: text('return_number').notNull(),
  storeId: text('store_id').notNull(),
  totalRefund: numeric('total_refund').notNull(),
  reason: text('reason'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull(),
  syncedAt: timestamp('synced_at', { mode: 'date' }),
  deletedAt: timestamp('deleted_at', { mode: 'date' })
})

export const transactionReturnItem = pgTable('transaction_return_item', {
  id: text('id').primaryKey(),
  returnId: text('return_id')
    .notNull()
    .references(() => transactionReturn.id),
  transactionItemId: text('transaction_item_id')
    .notNull()
    .references(() => transactionItems.id),
  productId: text('product_id').notNull(),
  quantity: numeric('quantity').notNull(),
  refundPrice: numeric('refund_price').notNull(),
  restock: boolean('restock').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull(),
  syncedAt: timestamp('synced_at', { mode: 'date' }),
  deletedAt: timestamp('deleted_at', { mode: 'date' })
})
