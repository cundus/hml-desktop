import { pgTable, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'

// SALES: Transactions, TransactionItems

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  storeId: text('store_id').notNull(),
  subtotal: numeric('subtotal').notNull(),
  discount: numeric('discount').notNull(),
  tax: numeric('tax').notNull(),
  total: numeric('total').notNull(),
  customerId: text('customer_id'),
  userId: text('user_id').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id'),
})

export const transactionItems = pgTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  customerId: text('customer_id'),

  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})
