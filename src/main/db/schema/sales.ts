import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// SALES / POS TRANSACTIONS
// Transactions, TransactionItems
////////////////////////////////////////////////////

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  storeId: text('store_id').notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  customerId: text('customer_id'),
  userId: text('user_id').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

export const transactionItems = sqliteTable('transaction_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionId: text('transaction_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  customerId: text('customer_id'),
  
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Relations
export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  items: many(transactionItems),
  // store: one(stores, ...),
  // customer: one(customers, ...),
  // user: one(users, ...),
}))

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionItems.transactionId],
    references: [transactions.id],
  }),
  // product: one(products, ...),
}))

// Types
export type Transaction = typeof transactions.$inferSelect
export type TransactionItem = typeof transactionItems.$inferSelect
