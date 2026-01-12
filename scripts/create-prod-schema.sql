-- ============================================
-- PETSHOP MANAGEMENT SYSTEM
-- PostgreSQL Production Database Schema
-- Generated: 2026-01-10
-- ============================================

-- ============================================
-- AUTH TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  pin TEXT,
  store_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS role (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS permission (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS user_role (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS role_permission (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

-- ============================================
-- STORE & CUSTOMER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS sales_person (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  type TEXT NOT NULL,
  default_sales_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  category_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- PRODUCT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  weight NUMERIC DEFAULT '0',
  category_id TEXT,
  supplier_id TEXT,
  is_service BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  device_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_price (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS batch (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expiry_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- UOM & PRICING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS uom (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS product_uom (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  conversion_factor NUMERIC NOT NULL,
  is_base_unit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS product_uom_category_price (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  price_category_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT,
  UNIQUE (product_id, uom_id, price_category_id)
);

CREATE TABLE IF NOT EXISTS store_product_uom_price (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  uom_id TEXT NOT NULL,
  price_category_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT,
  UNIQUE (product_id, uom_id, price_category_id, store_id)
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS product_location (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS stock_transaction (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference TEXT,
  batch_id TEXT,
  supplier_id TEXT,
  customer_id TEXT,
  performed_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS stock_adjustment (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  difference INTEGER NOT NULL,
  note TEXT,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

-- ============================================
-- SALES TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  store_id TEXT NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT '0',
  tax NUMERIC NOT NULL DEFAULT '0',
  total NUMERIC NOT NULL,
  total_weight NUMERIC DEFAULT '0',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_deadline TIMESTAMP,
  receipt_printed BOOLEAN NOT NULL DEFAULT FALSE,
  customer_id TEXT,
  user_id TEXT,
  sales_id TEXT,
  sales_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  display_quantity NUMERIC,
  uom_code TEXT,
  product_name TEXT,
  product_sku TEXT,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashier_shift (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  initial_cash NUMERIC NOT NULL DEFAULT '0',
  closing_cash NUMERIC,
  expected_cash NUMERIC,
  difference NUMERIC,
  notes TEXT,
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS shift_history (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS delivery_order (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  no_surat_jalan TEXT NOT NULL UNIQUE,
  sequence_number INTEGER NOT NULL,
  sequence_year INTEGER NOT NULL,
  tanggal TIMESTAMP NOT NULL,
  sales TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  notes TEXT,
  printed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- PURCHASING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  status TEXT NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_item (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TRANSFER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_request (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS transfer_item (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  deleted_at TIMESTAMP
);

-- ============================================
-- AUDIT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP,
  device_id TEXT
);

-- ============================================
-- PAYMENT METHOD (Master Data for Non-Cash)
-- ============================================

CREATE TABLE IF NOT EXISTS payment_method (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_method (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- INDEXES (Optional but recommended)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_location_product ON product_location(product_id);
CREATE INDEX IF NOT EXISTS idx_product_location_store ON product_location(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(code);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stock_transaction_product ON stock_transaction(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transaction_store ON stock_transaction(store_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shift_user ON cashier_shift(user_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shift_store ON cashier_shift(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id);

-- ============================================
-- END OF SCHEMA
-- ============================================
