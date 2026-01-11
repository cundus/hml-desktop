import { pgTable, text, integer, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'

// SALES: Transactions, TransactionItems, PaymentMethods

export const paymentMethods = pgTable('payment_method', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  storeId: text('store_id').notNull(),
  subtotal: numeric('subtotal').notNull(),
  discount: numeric('discount').notNull().default('0'),
  tax: numeric('tax').notNull().default('0'),
  total: numeric('total').notNull(),
  totalWeight: numeric('total_weight').default('0'),
  paymentMethod: text('payment_method').notNull().default('cash'),
  paymentDeadline: timestamp('payment_deadline', { withTimezone: false }),
  receiptPrinted: boolean('receipt_printed').notNull().default(false),
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
  displayQuantity: numeric('display_quantity'),
  uomCode: text('uom_code'),
  productName: text('product_name'),
  productSku: text('product_sku'),
  price: numeric('price').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
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

export const cashierShifts = pgTable('cashier_shift', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  storeId: text('store_id').notNull(),
  status: text('status').notNull().default('OPEN'),
  initialCash: numeric('initial_cash').notNull().default('0'),
  closingCash: numeric('closing_cash'),
  expectedCash: numeric('expected_cash'),
  difference: numeric('difference'),
  notes: text('notes'),
  openedAt: timestamp('opened_at', { withTimezone: false }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const shiftHistory = pgTable('shift_history', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const deliveryOrders = pgTable('delivery_order', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  noSuratJalan: text('no_surat_jalan').notNull().unique(),
  sequenceNumber: integer('sequence_number').notNull(),
  sequenceYear: integer('sequence_year').notNull(),
  tanggal: timestamp('tanggal', { withTimezone: false }).notNull(),
  sales: text('sales'),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerAddress: text('customer_address'),
  notes: text('notes'),
  printedAt: timestamp('printed_at', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow()
})
