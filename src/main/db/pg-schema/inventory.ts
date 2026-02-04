import { pgTable, text, integer, timestamp, doublePrecision } from 'drizzle-orm/pg-core'

// INVENTORY: ProductLocation, StockTransaction, StockAdjustment, DamagedGoods

export const productLocations = pgTable('product_location', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const stockTransactionTypeEnum = [
  'INBOUND',
  'OUTBOUND',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'SALE'
] as const

export const stockTransactions = pgTable('stock_transaction', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  reference: text('reference'),
  batchId: text('batch_id'),
  supplierId: text('supplier_id'),
  customerId: text('customer_id'),
  performedBy: text('performed_by'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const stockAdjustments = pgTable('stock_adjustment', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  difference: integer('difference').notNull(),
  note: text('note'),
  performedBy: text('performed_by').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  updatedAt: timestamp('updated_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const damagedGoods = pgTable('damaged_goods', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  storeId: text('store_id').notNull(),
  uomId: text('uom_id').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  cost: text('cost').notNull().default('0'),
  totalLoss: text('total_loss').notNull().default('0'),
  reason: text('reason').notNull(),
  notes: text('notes'),
  performedBy: text('performed_by').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

