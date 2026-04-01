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
  salesId: text('sales_id'),
  salesName: text('sales_name'),

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

// Expense Categories (Kategori Pengeluaran)
export const expenseCategories = pgTable('expense_category', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull().default('operational'), // 'shift' or 'operational'
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  categoryId: text('category_id'), // FK to expense_category
  shiftId: text('shift_id'), // nullable for operational expenses
  storeId: text('store_id'), // required for operational expenses
  item: text('item').notNull(),
  quantity: integer('quantity').notNull().default(1),
  price: numeric('price').notNull(),
  total: numeric('total').notNull(),
  description: text('description'),
  createdBy: text('created_by'),
  expenseDate: timestamp('expense_date', { withTimezone: false }).notNull().defaultNow(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
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

// Open Bill - holds paused/deferred cart state
export const openBills = pgTable('open_bill', {
  id: text('id').primaryKey(),
  label: text('label'),
  storeId: text('store_id').notNull(),
  shiftId: text('shift_id').notNull(),
  customerId: text('customer_id'),
  salesId: text('sales_id'),
  salesName: text('sales_name'),
  subtotal: numeric('subtotal').notNull().default('0'),
  discount: numeric('discount').notNull().default('0'),
  total: numeric('total').notNull().default('0'),
  notes: text('notes'),
  createdBy: text('created_by'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

// Open Bill Items - items in a held/paused cart
export const openBillItems = pgTable('open_bill_item', {
  id: text('id').primaryKey(),
  openBillId: text('open_bill_id').notNull(),
  productId: text('product_id').notNull(),
  cartItemId: text('cart_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  displayQuantity: numeric('display_quantity'),
  uomCode: text('uom_code'),
  uomId: text('uom_id'),
  priceCategoryId: text('price_category_id'),
  priceCategoryName: text('price_category_name'),
  conversionFactor: numeric('conversion_factor').notNull().default('1'),
  baseQuantity: numeric('base_quantity').notNull(),
  productName: text('product_name'),
  productSku: text('product_sku'),
  unitPrice: numeric('unit_price').notNull(),
  weight: numeric('weight').default('0'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow()
})
