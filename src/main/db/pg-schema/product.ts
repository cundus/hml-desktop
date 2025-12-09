import { pgTable, text, boolean, numeric, timestamp, integer, unique } from 'drizzle-orm/pg-core'

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
  deviceId: text('device_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

export const categories = pgTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

export const suppliers = pgTable('supplier', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

export const productPrices = pgTable('product_price', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  price: numeric('price').notNull(),
  cost: numeric('cost').notNull(),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const batches = pgTable('batch', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  code: text('code').notNull(),
  expiryDate: timestamp('expiry_date', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

export const uom = pgTable('uom', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  deviceId: text('device_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

// PRICE CATEGORY & MULTI-UOM PRICING TABLES

export const priceCategories = pgTable('price_category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const productUoms = pgTable('product_uom', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  uomId: text('uom_id').notNull(),
  conversionFactor: numeric('conversion_factor').notNull(),
  isBaseUnit: boolean('is_base_unit').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const productUomCategoryPrices = pgTable('product_uom_category_price', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  uomId: text('uom_id').notNull(),
  priceCategoryId: text('price_category_id').notNull(),
  price: numeric('price').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
}, (table) => ({
  uniqProductUomCategory: unique().on(table.productId, table.uomId, table.priceCategoryId)
}))

export const storeProductUomPrices = pgTable('store_product_uom_price', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  uomId: text('uom_id').notNull(),
  priceCategoryId: text('price_category_id').notNull(),
  storeId: text('store_id').notNull(),
  price: numeric('price').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
}, (table) => ({
  uniqStorePrice: unique().on(table.productId, table.uomId, table.priceCategoryId, table.storeId)
}))
