import { pgTable, text, boolean, numeric, timestamp } from 'drizzle-orm/pg-core'

// PRODUCT: Product, Category, Supplier, ProductPrice, Batch

export const products = pgTable('product', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(),
  cost: numeric('cost').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  categoryId: text('category_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})

export const categories = pgTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})

export const suppliers = pgTable('supplier', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})

export const productPrices = pgTable('product_price', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  price: numeric('price').notNull(),
  startDate: timestamp('start_date', { withTimezone: false }).notNull(),
  endDate: timestamp('end_date', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})

export const batches = pgTable('batch', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  code: text('code').notNull(),
  expiryDate: timestamp('expiry_date', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
})
