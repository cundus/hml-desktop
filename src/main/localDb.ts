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

  // Users table
  database.run(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      store_id TEXT,
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
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

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
      customer_id TEXT,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Transaction Items table - sales line items
  database.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

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
