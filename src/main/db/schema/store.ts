import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// STORE & CUSTOMER MANAGEMENT
// Store, Customer, CustomerCategory
////////////////////////////////////////////////////

export const stores = sqliteTable('store', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  type: text('type').notNull().default('RETAIL'), // RETAIL, WAREHOUSE, etc.
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const customers = sqliteTable('customer', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  phone: text('phone'),
  categoryId: text('category_id').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const customerCategories = sqliteTable('customer_category', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Relations
export const storesRelations = relations(stores, ({ many }) => ({
  users: many(stores), // Will be properly linked when we import users
}))

export const customersRelations = relations(customers, ({ one }) => ({
  category: one(customerCategories, {
    fields: [customers.categoryId],
    references: [customerCategories.id],
  }),
}))

export const customerCategoriesRelations = relations(customerCategories, ({ many }) => ({
  customers: many(customers),
}))

// Types
export type Store = typeof stores.$inferSelect
export type Customer = typeof customers.$inferSelect
export type CustomerCategory = typeof customerCategories.$inferSelect
