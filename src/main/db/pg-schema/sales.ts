import { pgTable, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core'

// SALES: Transactions, TransactionItems

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  storeId: text('store_id').notNull(),
  subtotal: numeric('subtotal').notNull(),
  discount: numeric('discount').notNull().default('0'),
  tax: numeric('tax').notNull().default('0'),
  total: numeric('total').notNull(),
  customerId: text('customer_id'),
  userId: text('user_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const transactionItems = pgTable('transaction_items', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  price: numeric('price').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow()
})

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull(),
  item: text('item').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price: numeric('price').notNull(),
  total: numeric('total').notNull(),
  description: text('description'),
  createdBy: text('created_by'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})
