/* eslint-disable @typescript-eslint/no-explicit-any */
import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

let db: Database | null = null
let SQL: any = null

/**
 * Initialize sql.js and load/create the local database
 */
export async function initLocalDb(): Promise<Database> {
  if (db) return db

  // Initialize sql.js
  SQL = await initSqlJs({
    // Load the wasm binary from node_modules
    locateFile: (file) => join(__dirname, '../../node_modules/sql.js/dist', file)
  })

  // Get database file path
  const dbPath = join(app.getPath('userData'), 'petshop-local.db')

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('✓ Local database loaded:', dbPath)
  } else {
    db = new SQL.Database()
    console.log('✓ Local database created:', dbPath)
  }

  // Create tables if they don't exist
  if (!db) throw new Error('Failed to initialize database')
  await createTables(db)

  // Run migrations for existing databases
  await runMigrations(db)

  // Save to disk
  saveDb(db, dbPath)

  return db
}

/**
 * Create all required tables
 */
async function createTables(database: Database): Promise<void> {
  // Categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Suppliers table
  database.run(`
    CREATE TABLE IF NOT EXISTS supplier (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Stores table
  database.run(`
    CREATE TABLE IF NOT EXISTS store (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Customer Categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS customer_category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Unit of Measure (UOM) table
  database.run(`
    CREATE TABLE IF NOT EXISTS uom (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Price Category table
  database.run(`
    CREATE TABLE IF NOT EXISTS price_category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Product UOM table (per-product UOM definitions)
  database.run(`
    CREATE TABLE IF NOT EXISTS product_uom (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      uom_id TEXT NOT NULL,
      conversion_factor REAL NOT NULL,
      is_base_unit INTEGER NOT NULL DEFAULT 0,
      cost TEXT,
      cost_override INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Migration: Add cost columns for existing databases
  try {
    database.run(`ALTER TABLE product_uom ADD COLUMN cost TEXT`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE product_uom ADD COLUMN cost_override INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists
  }

  // Default prices per (product, UOM, price category)
  database.run(`
    CREATE TABLE IF NOT EXISTS product_uom_category_price (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      uom_id TEXT NOT NULL,
      price_category_id TEXT NOT NULL,
      price TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT,
      UNIQUE (product_id, uom_id, price_category_id)
    )
  `)

  // Store-specific price overrides per (product, UOM, price category, store)
  database.run(`
    CREATE TABLE IF NOT EXISTS store_product_uom_price (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      uom_id TEXT NOT NULL,
      price_category_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      price TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT,
      UNIQUE (product_id, uom_id, price_category_id, store_id)
    )
  `)

  // Users table
  database.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      pin TEXT,
      store_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Add PIN column if not exists (for existing databases)
  try {
    database.run('ALTER TABLE user ADD COLUMN pin TEXT')
  } catch {
    // Column already exists
  }

  // Roles table
  database.run(`
    CREATE TABLE IF NOT EXISTS role (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Permissions table
  database.run(`
    CREATE TABLE IF NOT EXISTS permission (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // User-Role mapping table
  database.run(`
    CREATE TABLE IF NOT EXISTS user_role (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Role-Permission mapping table
  database.run(`
    CREATE TABLE IF NOT EXISTS role_permission (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Products table
  database.run(`
    CREATE TABLE IF NOT EXISTS product (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      cost TEXT NOT NULL,
      category_id TEXT,
      supplier_id TEXT,
      is_service INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Add supplier_id and is_service columns if they don't exist (migration for existing DBs)
  try {
    database.run('ALTER TABLE product ADD COLUMN supplier_id TEXT')
  } catch {
    // Column already exists
  }
  try {
    database.run('ALTER TABLE product ADD COLUMN is_service INTEGER NOT NULL DEFAULT 0')
  } catch {
    // Column already exists
  }
  try {
    database.run('ALTER TABLE product ADD COLUMN weight TEXT DEFAULT "0"')
  } catch {
    // Column already exists
  }

  // Customer table
  database.run(`
    CREATE TABLE IF NOT EXISTS customer (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      category_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Product Price table - store-specific pricing
  database.run(`
    CREATE TABLE IF NOT EXISTS product_price (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      price TEXT NOT NULL,
      cost TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Batch table - product batches
  database.run(`
    CREATE TABLE IF NOT EXISTS batch (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expiry_date INTEGER,
      cost TEXT NOT NULL DEFAULT '0',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Migration: Add cost to batch if missing
  try {
    database.run(`ALTER TABLE batch ADD COLUMN cost TEXT NOT NULL DEFAULT '0'`)
  } catch {
    // Column already exists
  }

  // Product Location table - inventory per store
  database.run(`
    CREATE TABLE IF NOT EXISTS product_location (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      reserved_quantity INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Stock Transaction table - inventory movements
  database.run(`
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Transactions table - sales/POS
  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      store_id TEXT NOT NULL,
      subtotal TEXT NOT NULL,
      discount TEXT NOT NULL DEFAULT '0',
      tax TEXT NOT NULL DEFAULT '0',
      total TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      payment_deadline INTEGER,
      receipt_printed INTEGER NOT NULL DEFAULT 0,
      customer_id TEXT,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Add payment columns to existing transactions table (migration)
  try {
    database.run(`ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transactions ADD COLUMN payment_deadline INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transactions ADD COLUMN receipt_printed INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transactions ADD COLUMN total_weight TEXT DEFAULT '0'`)
  } catch {
    // Column already exists
  }

  // Expenses table - daily operational expenses
  database.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      shift_id TEXT,
      category_id TEXT,
      store_id TEXT,
      item TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price TEXT NOT NULL,
      total TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      expense_date INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      FOREIGN KEY (shift_id) REFERENCES shifts (id)
    )
  `)

  // Add expenses table migration for existing databases (only if table exists but missing columns)
  try {
    // Check if expenses table exists first
    const tableExists = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'")
      .get()
    if (tableExists) {
      // Try to add columns one by one - if they already exist, the ALTER will fail and we catch it
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN shift_id TEXT NOT NULL DEFAULT ''`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN item TEXT NOT NULL DEFAULT ''`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN price TEXT NOT NULL DEFAULT '0'`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN total TEXT NOT NULL DEFAULT '0'`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN description TEXT`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN created_by TEXT`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN synced_at INTEGER`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN deleted_at INTEGER`)
      } catch {
        // Column already exists
      }
      try {
        database.run(`ALTER TABLE expenses ADD COLUMN expense_date INTEGER`)
        // Backfill: set expense_date = created_at for existing records
        database.run(`UPDATE expenses SET expense_date = created_at WHERE expense_date IS NULL`)
      } catch {
        // Column already exists
      }
    }
  } catch {
    // Table doesn't exist or migration failed, CREATE TABLE will handle it
  }

  // Transaction Items table - sales line items
  database.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Add missing columns to transaction_items if they don't exist
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN synced_at INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN deleted_at INTEGER`)
  } catch {
    // Column already exists
  }
  // Migration: Add display info for receipt printing
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN display_quantity REAL`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN uom_code TEXT`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN product_name TEXT`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE transaction_items ADD COLUMN product_sku TEXT`)
  } catch {
    // Column already exists
  }

  // Purchase Order table
  database.run(`
    CREATE TABLE IF NOT EXISTS purchase_order (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      total TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Purchase Order Item table
  database.run(`
    CREATE TABLE IF NOT EXISTS purchase_order_item (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Stock Adjustment table - tracks manual stock adjustments
  database.run(`
    CREATE TABLE IF NOT EXISTS stock_adjustment (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      difference INTEGER NOT NULL,
      note TEXT,
      performed_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Add missing columns to stock_adjusment if they don't exist
  try {
    database.run(`ALTER TABLE stock_adjustment ADD COLUMN synced_at INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE stock_adjustment ADD COLUMN deleted_at INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    database.run(`ALTER TABLE stock_adjustment ADD COLUMN updated_at INTEGER`)
  } catch {
    // Column already exists
  }

  // Damaged Goods table - tracks damaged/lost inventory
  database.run(`
    CREATE TABLE IF NOT EXISTS damaged_goods (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      uom_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      cost TEXT NOT NULL DEFAULT '0',
      total_loss TEXT NOT NULL DEFAULT '0',
      reason TEXT NOT NULL,
      notes TEXT,
      performed_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT,
      FOREIGN KEY (product_id) REFERENCES product (id),
      FOREIGN KEY (store_id) REFERENCES store (id),
      FOREIGN KEY (uom_id) REFERENCES uom (id)
    )
  `)

  // Sync metadata table - tracks sync state per entity
  database.run(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_name TEXT NOT NULL UNIQUE,
      last_sync_at INTEGER,
      last_pull_at INTEGER,
      last_push_at INTEGER,
      device_id TEXT
    )
  `)

  // Cashier Shift table - tracks cashier shifts
  database.run(`
    CREATE TABLE IF NOT EXISTS cashier_shift (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      initial_cash TEXT NOT NULL DEFAULT '0',
      closing_cash TEXT,
      expected_cash TEXT,
      difference TEXT,
      notes TEXT,
      opened_at INTEGER NOT NULL,
      closed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Shift History table - tracks backup cashier changes
  database.run(`
    CREATE TABLE IF NOT EXISTS shift_history (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  try {
    database.run(`ALTER TABLE shift_history ADD COLUMN updated_at INTEGER`)
  } catch {
    // Column already exists
  }

  // Transfer Request table - stock transfers between stores
  database.run(`
    CREATE TABLE IF NOT EXISTS transfer_request (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      destination_id TEXT NOT NULL,
      reference TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Transfer Item table - items in a transfer request
  database.run(`
    CREATE TABLE IF NOT EXISTS transfer_item (
      id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `)

  // Audit Log table - tracks user actions for audit trail
  database.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT,
      store_id TEXT,
      store_name TEXT,
      device_id TEXT,
      old_values TEXT,
      new_values TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Printer Configuration table - supports multiple printers with different types
  database.run(`
    CREATE TABLE IF NOT EXISTS printer_config (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      printer_name TEXT NOT NULL,
      printer_type TEXT NOT NULL,
      paper_size TEXT NOT NULL,
      purpose TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      copies INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Delivery Order (Surat Jalan) table
  database.run(`
    CREATE TABLE IF NOT EXISTS delivery_order (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      no_surat_jalan TEXT NOT NULL UNIQUE,
      sequence_number INTEGER NOT NULL,
      sequence_year INTEGER NOT NULL,
      tanggal INTEGER NOT NULL,
      sales TEXT,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_address TEXT,
      notes TEXT,
      printed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
  `)

  // Payment Method master data table (for non-cash payment methods)
  database.run(`
    CREATE TABLE IF NOT EXISTS payment_method (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Open Bill table - holds paused/deferred cart state
  database.run(`
    CREATE TABLE IF NOT EXISTS open_bill (
      id TEXT PRIMARY KEY,
      label TEXT,
      store_id TEXT NOT NULL,
      shift_id TEXT NOT NULL,
      customer_id TEXT,
      sales_id TEXT,
      sales_name TEXT,
      subtotal TEXT NOT NULL DEFAULT '0',
      discount TEXT NOT NULL DEFAULT '0',
      total TEXT NOT NULL DEFAULT '0',
      notes TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )
  `)

  // Open Bill Item table - items in a held/paused cart
  database.run(`
    CREATE TABLE IF NOT EXISTS open_bill_item (
      id TEXT PRIMARY KEY,
      open_bill_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      cart_item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      display_quantity REAL,
      uom_code TEXT,
      uom_id TEXT,
      price_category_id TEXT,
      price_category_name TEXT,
      conversion_factor REAL NOT NULL DEFAULT 1,
      base_quantity REAL NOT NULL,
      product_name TEXT,
      product_sku TEXT,
      unit_price TEXT NOT NULL,
      weight TEXT DEFAULT '0',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (open_bill_id) REFERENCES open_bill(id)
    )
  `)

  // Sales Person master data table (for tracking sales commissions)
  database.run(`
    CREATE TABLE IF NOT EXISTS sales_person (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  console.log('✓ Database tables initialized')
}

/**
 * Save database to disk
 */
export function saveDb(database: Database, dbPath?: string): void {
  const path = dbPath || join(app.getPath('userData'), 'petshop-local.db')
  const data = database.export()
  const buffer = Buffer.from(data)
  writeFileSync(path, buffer)
}

/**
 * Get the current database instance
 */
export function getLocalDb(): Database {
  if (!db) {
    throw new Error('Local database not initialized. Call initLocalDb() first.')
  }
  return db
}

/**
 * Close and save the database
 */
export function closeLocalDb(): void {
  if (db) {
    const dbPath = join(app.getPath('userData'), 'petshop-local.db')
    saveDb(db, dbPath)
    db.close()
    db = null
    console.log('✓ Local database closed')
  }
}

/**
 * Helper to convert timestamp to Date
 */
export function timestampToDate(timestamp: number | null): Date | null {
  return timestamp ? new Date(timestamp) : null
}

/**
 * Helper to convert Date to timestamp
 */
export function dateToTimestamp(date: Date | null): number | null {
  return date ? date.getTime() : null
}

/**
 * Run database migrations for existing databases
 * This adds new columns to existing tables without losing data
 */
async function runMigrations(database: Database): Promise<void> {
  console.log('Running database migrations...')

  // Migration: Add phone and email columns to store table
  try {
    database.run('ALTER TABLE store ADD COLUMN phone TEXT')
    console.log('✓ Added phone column to store table')
  } catch {
    // Column already exists, ignore
  }

  try {
    database.run('ALTER TABLE store ADD COLUMN email TEXT')
    console.log('✓ Added email column to store table')
  } catch {
    // Column already exists, ignore
  }

  // Migration: Add default_sales_id to store table
  try {
    database.run('ALTER TABLE store ADD COLUMN default_sales_id TEXT')
    console.log('✓ Added default_sales_id column to store table')
  } catch {
    // Column already exists, ignore
  }

  // Migration: Add sales_id and sales_name to transactions table
  try {
    database.run('ALTER TABLE transactions ADD COLUMN sales_id TEXT')
    console.log('✓ Added sales_id column to transactions table')
  } catch {
    // Column already exists, ignore
  }

  try {
    database.run('ALTER TABLE transactions ADD COLUMN sales_name TEXT')
    console.log('✓ Added sales_name column to transactions table')
  } catch {
    // Column already exists, ignore
  }

  // Migration: Fix expenses schema (make shift_id nullable, add category_id/store_id)
  try {
    // Check if we need to migrate by checking if shift_id is PK or NOT NULL
    // Or simply check if expenses table exists and category_id is missing
    const tableInfo = database.prepare("PRAGMA table_info(expenses)")
    let needsMigration = false
    let hasCategoryId = false
    
    while (tableInfo.step()) {
      const row = tableInfo.getAsObject()
      if (row.name === 'shift_id' && row.notnull === 1) {
        needsMigration = true
      }
      if (row.name === 'category_id') {
        hasCategoryId = true
      }
    }
    tableInfo.free()

    if (!hasCategoryId) needsMigration = true

    if (needsMigration) {
      console.log('Migrating expenses table to update schema...')
      
      database.run("ALTER TABLE expenses RENAME TO expenses_old")

      database.run(`
        CREATE TABLE expenses (
          id TEXT PRIMARY KEY,
          shift_id TEXT,
          category_id TEXT,
          store_id TEXT,
          item TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          price TEXT NOT NULL,
          total TEXT NOT NULL,
          description TEXT,
          created_by TEXT,
          expense_date INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          synced_at INTEGER,
          deleted_at INTEGER
        )
      `)

      // Attempt to copy data. 
      // We handle potential missing columns in source by not selecting them if they don't exist?
      // Actually, standard columns should be there. 
      // We know expenses_old has: id, shift_id, item, quantity, price, total, created_at, updated_at
      // And potentially: description, created_by, synced_at, deleted_at
      // Use logic to robustly copy.
      
      const columns = ['id', 'shift_id', 'item', 'quantity', 'price', 'total', 'description', 'created_by', 'expense_date', 'created_at', 'updated_at', 'synced_at', 'deleted_at']
      const oldColumns: string[] = []
      
      const oldTableInfo = database.prepare("PRAGMA table_info(expenses_old)")
      while(oldTableInfo.step()) {
        const row = oldTableInfo.getAsObject()
        if (columns.includes(row.name as string)) {
          oldColumns.push(row.name as string)
        }
      }
      oldTableInfo.free()
      
      const colString = oldColumns.join(', ')
      
      if (oldColumns.length > 0) {
        database.run(`
          INSERT INTO expenses (${colString})
          SELECT ${colString} FROM expenses_old
        `)
      }

      database.run("DROP TABLE expenses_old")
      console.log('✓ Expenses table migration completed')
    }
  } catch (error) {
    console.error('Failed to migrate expenses table:', error)
  }

  console.log('✓ Database migrations completed')
}
