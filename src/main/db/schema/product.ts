import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// PRODUCT MANAGEMENT
// Product, Category, Supplier, ProductPrice, Batch
////////////////////////////////////////////////////

export const products = sqliteTable('product', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(),
  cost: real('cost').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  categoryId: text('category_id'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const categories = sqliteTable('category', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const suppliers = sqliteTable('supplier', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const productPrices = sqliteTable('product_price', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  price: real('price').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

export const batches = sqliteTable('batch', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull(),
  code: text('code').notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  batches: many(batches),
  productPrices: many(productPrices),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  // purchaseOrders: many(purchaseOrders),
}))

export const productPricesRelations = relations(productPrices, ({ one }) => ({
  product: one(products, {
    fields: [productPrices.productId],
    references: [products.id],
  }),
}))

export const batchesRelations = relations(batches, ({ one }) => ({
  product: one(products, {
    fields: [batches.productId],
    references: [products.id],
  }),
}))

// Types
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Category = typeof categories.$inferSelect
export type Supplier = typeof suppliers.$inferSelect
export type ProductPrice = typeof productPrices.$inferSelect
export type Batch = typeof batches.$inferSelect
