import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { saveDb } from './localDb'

/**
 * Constant timestamp for all seed data to ensure deterministic sync.
 * Set to 2024-01-01 00:00:00 UTC
 */
const SEED_TIMESTAMP = 1704067200000

interface SeedPermission {
  id: string
  name: string
  description?: string
}

interface SeedUom {
  code: string
  name: string
}

interface SeedPriceCategory {
  id: string
  name: string
  description?: string
}

const permissionCatalog: SeedPermission[] = [
  // Dashboard
  { id: 'dashboard.view', name: 'View dashboard' },

  // Sales
  { id: 'sales.pos.view', name: 'View POS', description: 'Access to Point of Sale screen' },
  { id: 'sales.pos.create', name: 'Create orders (POS)', description: 'Process new sales' },
  { id: 'sales.transaction.view', name: 'View transactions' },
  {
    id: 'sales.transaction.view-profit',
    name: 'View transaction profit',
    description: 'See profit/loss details in transactions'
  },
  {
    id: 'sales.transaction.edit',
    name: 'Edit transactions',
    description: 'Modify transaction details'
  },
  {
    id: 'sales.transaction.delete',
    name: 'Cancel transactions',
    description: 'Void or soft-delete transactions'
  },
  { id: 'sales.return.view', name: 'View returns' },
  { id: 'sales.return.create', name: 'Create returns' },

  // Inventory
  { id: 'inventory.dashboard.view', name: 'View inventory dashboard' },
  { id: 'inventory.stock.view', name: 'View stock levels' },
  {
    id: 'inventory.stock.adjust',
    name: 'Adjust stock',
    description: 'Manually correct stock levels'
  },
  { id: 'inventory.opname.view', name: 'View stock opname' },
  { id: 'inventory.opname.create', name: 'Create stock opname' },
  {
    id: 'inventory.opname.process',
    name: 'Process stock opname',
    description: 'Finalize and apply stock opname results'
  },
  { id: 'inventory.batch.view', name: 'View batches' },
  { id: 'inventory.batch.edit', name: 'Edit batches' },

  // Purchasing
  { id: 'purchasing.order.view', name: 'View purchase orders' },
  { id: 'purchasing.order.create', name: 'Create purchase orders' },
  { id: 'purchasing.order.edit', name: 'Edit purchase orders' },
  { id: 'purchasing.order.delete', name: 'Delete purchase orders' },

  // Operations
  { id: 'operations.expense.view', name: 'View shift expenses' },
  { id: 'operations.expense.create', name: 'Create shift expenses' },
  { id: 'operations.expense.delete', name: 'Delete shift expenses' },
  { id: 'operations.operational-expense.view', name: 'View operational expenses' },
  { id: 'operations.operational-expense.create', name: 'Create operational expenses' },
  { id: 'operations.shift.view', name: 'View shift history' },

  // Pricing
  { id: 'pricing.product.view', name: 'View product prices' },
  { id: 'pricing.product.edit', name: 'Edit product prices' },
  { id: 'pricing.category.view', name: 'View price categories' },
  { id: 'pricing.category.manage', name: 'Manage price categories' },

  // Finance
  { id: 'finance.cashflow.view', name: 'View cash flow' },
  { id: 'finance.profit-loss.view', name: 'View profit & loss' },

  // Master Data - Products
  { id: 'master.product.view', name: 'View products' },
  { id: 'master.product.create', name: 'Create products' },
  { id: 'master.product.edit', name: 'Edit products' },
  { id: 'master.product.delete', name: 'Delete products' },
  { id: 'master.product.import', name: 'Import products' },
  { id: 'master.product.export', name: 'Export products' },

  // Master Data - Categories
  { id: 'master.category.view', name: 'View categories' },
  { id: 'master.category.create', name: 'Create categories' },
  { id: 'master.category.edit', name: 'Edit categories' },
  { id: 'master.category.delete', name: 'Delete categories' },

  // Master Data - Customers
  { id: 'master.customer.view', name: 'View customers' },
  { id: 'master.customer.create', name: 'Create customers' },
  { id: 'master.customer.edit', name: 'Edit customers' },
  { id: 'master.customer.delete', name: 'Delete customers' },

  // Master Data - Suppliers
  { id: 'master.supplier.view', name: 'View suppliers' },
  { id: 'master.supplier.create', name: 'Create suppliers' },
  { id: 'master.supplier.edit', name: 'Edit suppliers' },
  { id: 'master.supplier.delete', name: 'Delete suppliers' },

  // Master Data - Stores
  { id: 'master.store.view', name: 'View stores' },
  { id: 'master.store.create', name: 'Create stores' },
  { id: 'master.store.edit', name: 'Edit stores' },
  { id: 'master.store.delete', name: 'Delete stores' },

  // Master Data - Users
  { id: 'master.user.view', name: 'View users' },
  { id: 'master.user.create', name: 'Create users' },
  { id: 'master.user.edit', name: 'Edit users' },
  { id: 'master.user.delete', name: 'Delete users' },
  { id: 'master.user.reset-password', name: 'Reset user password' },

  // Master Data - Others
  { id: 'master.uom.view', name: 'View UOMs' },
  { id: 'master.uom.create', name: 'Create UOMs' },
  { id: 'master.uom.edit', name: 'Edit UOMs' },
  { id: 'master.uom.delete', name: 'Delete UOMs' },
  { id: 'master.customer-category.view', name: 'View customer categories' },
  { id: 'master.customer-category.create', name: 'Create customer categories' },
  { id: 'master.customer-category.edit', name: 'Edit customer categories' },
  { id: 'master.customer-category.delete', name: 'Delete customer categories' },
  { id: 'master.expense-category.view', name: 'View expense categories' },
  { id: 'master.expense-category.create', name: 'Create expense categories' },
  { id: 'master.expense-category.edit', name: 'Edit expense categories' },
  { id: 'master.expense-category.delete', name: 'Delete expense categories' },
  { id: 'master.payment-method.view', name: 'View payment methods' },
  { id: 'master.payment-method.manage', name: 'Manage payment methods' },
  { id: 'master.sales-person.view', name: 'View sales persons' },
  { id: 'master.sales-person.manage', name: 'Manage sales persons' },
  { id: 'inventory.damaged-goods.view', name: 'View damaged goods' },
  { id: 'inventory.damaged-goods.manage', name: 'Manage damaged goods' },
  { id: 'settings.point.view', name: 'View point settings' },
  { id: 'settings.point.manage', name: 'Manage point settings' },

  // Settings
  { id: 'settings.view', name: 'View settings' },
  { id: 'settings.role.view', name: 'View roles' },
  { id: 'settings.role.manage', name: 'Manage roles' },
  { id: 'settings.config.view', name: 'View app config' },
  { id: 'settings.config.edit', name: 'Edit app config' },
  { id: 'system.audit.view', name: 'View audit logs' }
]

interface SeedRole {
  id: string
  name: string
  description: string
  permissionPrefixes: string[]
}

const roleCatalog: SeedRole[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Administrator with full access to all features',
    permissionPrefixes: ['*'] // All permissions
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Store manager with access to everything except system settings',
    permissionPrefixes: [
      'dashboard',
      'sales',
      'inventory',
      'purchasing',
      'operations',
      'pricing',
      'finance',
      'master',
      'settings.view',
      'settings.role.view'
    ]
  },
  {
    id: 'role-cashier',
    name: 'Cashier',
    description: 'Store cashier with access to POS and returns only',
    permissionPrefixes: [
      'sales.pos',
      'sales.transaction.view',
      'sales.return',
      'operations.expense',
      'dashboard.view'
    ]
  }
]

/**
 * Reset and reseed permissions - deletes existing permissions and role_permissions, then reseeds.
 * Use this to fix duplicate permissions or permission catalog changes.
 */
/**
 * Reset and reseed permissions and roles - deletes existing permissions, role_permissions, and standard roles.
 * Use this to force a fresh start for access control.
 */
export async function resetAndReseedPermissions(db: Database): Promise<void> {
  console.log('[Seed] Resetting access control tables...')

  // 1. Clear mapping tables first
  db.run('DELETE FROM role_permission')

  // 2. Clear permissions
  db.run('DELETE FROM permission')

  // 3. Clear standard roles (keep custom ones if any)
  const standardRoleIds = roleCatalog.map((r) => `'${r.id}'`).join(',')
  db.run(`DELETE FROM role WHERE id IN (${standardRoleIds})`)

  // 4. Re-seed everything
  await seedPermissions(db)
  await seedRoles(db)
  await seedAdmin(db)

  saveDb(db)
  console.log('[Seed] Access control reset complete.')
}

const priceCategoryCatalog: SeedPriceCategory[] = [{ id: 'RETAIL', name: 'RETAIL' }]

export async function seedPriceCategories(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  for (const cat of priceCategoryCatalog) {
    db.run(
      'INSERT OR IGNORE INTO price_category (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.description ?? null, now, now]
    )
  }

  saveDb(db)
}

/**
 * Seed the permission table with the default catalog.
 * This is idempotent: uses INSERT OR IGNORE on permission.id.
 */
export async function seedPermissions(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  for (const perm of permissionCatalog) {
    db.run(
      'INSERT OR IGNORE INTO permission (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [perm.id, perm.name, perm.description ?? null, now, now]
    )
  }

  saveDb(db)
}

/**
 * Seed roles and their standard permissions.
 */
export async function seedRoles(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  // 1. Seed Roles
  for (const role of roleCatalog) {
    db.run(
      'INSERT OR IGNORE INTO role (id, name, description, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
      [role.id, role.name, role.description, now, now]
    )

    // 2. Map Permissions based on prefixes
    for (const perm of permissionCatalog) {
      const isMatch = role.permissionPrefixes.some(
        (prefix) => prefix === '*' || perm.id === prefix || perm.id.startsWith(`${prefix}.`)
      )

      if (isMatch) {
        const rpId = `${role.id}:${perm.id}`
        db.run(
          'INSERT OR IGNORE INTO role_permission (id, role_id, permission_id, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
          [rpId, role.id, perm.id, now, now]
        )
      }
    }
  }

  saveDb(db)
  console.log('✓ Roles and permissions seeded')
}

/**
 * Seed a default admin user and assign it the admin role.
 * User: id 'user-admin', name 'Admin', email 'admin@example.com', password 'admin123'
 * All operations are idempotent.
 */
export async function seedAdmin(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  const adminRoleId = 'role-admin'
  const adminUserId = 'user-admin'

  // Ensure admin user exists
  db.run(
    'INSERT OR IGNORE INTO user (id, name, email, password, store_id, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL)',
    [adminUserId, 'Admin', 'admin@example.com', 'admin123', now, now]
  )

  // Ensure user_role mapping exists (admin user -> admin role)
  const userRoleId = 'user-role-admin-admin'
  db.run(
    'INSERT OR IGNORE INTO user_role (id, user_id, role_id, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
    [userRoleId, adminUserId, adminRoleId, now, now]
  )

  saveDb(db)
}

interface SeedUom {
  id: string
  code: string
  name: string
}

const uomCatalog: SeedUom[] = [
  { id: '00000000-0000-0000-0000-000000000001', code: 'PCS', name: 'Pieces' },
  { id: '00000000-0000-0000-0000-000000000002', code: 'SAK', name: 'Sak/Karung' },
  { id: '00000000-0000-0000-0000-000000000003', code: 'BOX', name: 'Box' },
  { id: '00000000-0000-0000-0000-000000000004', code: 'DUS', name: 'Dus/Karton' },
  { id: '00000000-0000-0000-0000-000000000005', code: 'PACK', name: 'Pack' },
  { id: '00000000-0000-0000-0000-000000000006', code: 'KG', name: 'Kilogram' },
  { id: '00000000-0000-0000-0000-000000000007', code: 'GR', name: 'Gram' },
  { id: '00000000-0000-0000-0000-000000000008', code: 'LTR', name: 'Liter' },
  { id: '00000000-0000-0000-0000-000000000009', code: 'ML', name: 'Mililiter' },
  { id: '00000000-0000-0000-0000-000000000010', code: 'BTL', name: 'Botol' },
  { id: '00000000-0000-0000-0000-000000000011', code: 'SET', name: 'Set' },
  { id: '00000000-0000-0000-0000-000000000012', code: 'ROLL', name: 'Roll' },
  { id: '00000000-0000-0000-0000-000000000013', code: 'MTR', name: 'Meter' }
]

/**
 * Seed the UOM table with default units.
 * This is idempotent: uses INSERT OR IGNORE on uom.code.
 */
export async function seedUoms(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  for (const uom of uomCatalog) {
    db.run(
      'INSERT OR IGNORE INTO uom (id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [uom.id, uom.code, uom.name, now, now]
    )
  }

  saveDb(db)
}

/**
 * Backfill base product_uom rows and store_product_uom_price rows
 * from existing product and product_price data.
 *
 * - For each product: ensure a base product_uom with conversion_factor = 1
 *   using product.unit mapped to uom.code.
 * - For each product_price row: create a store_product_uom_price row
 *   with price_category_id = 'RETAIL' for the product's base UOM.
 *
 * This function is idempotent and safe to run on every startup.
 */
export async function backfillProductUomsAndStorePrices(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  // Ensure RETAIL category exists
  const retailStmt = db.prepare("SELECT id FROM price_category WHERE id = 'RETAIL' LIMIT 1")
  let retailCategoryId: string | null = null
  if (retailStmt.step()) {
    const row = retailStmt.getAsObject()
    retailCategoryId = row.id as string
  }
  retailStmt.free()

  if (!retailCategoryId) {
    // Price categories not seeded yet; nothing to backfill
    return
  }

  // Backfill base product_uom rows
  const productStmt = db.prepare('SELECT id, unit FROM product WHERE deleted_at IS NULL')
  while (productStmt.step()) {
    const row = productStmt.getAsObject()
    const productId = row.id as string
    const unitCode = (row.unit as string | null) ?? ''
    if (!unitCode) continue

    // Find matching UOM by code
    const uomStmt = db.prepare('SELECT id FROM uom WHERE code = ? AND deleted_at IS NULL LIMIT 1')
    uomStmt.bind([unitCode])
    let uomId: string | null = null
    if (uomStmt.step()) {
      const uomRow = uomStmt.getAsObject()
      uomId = uomRow.id as string
    }
    uomStmt.free()

    if (!uomId) continue

    // Check if base product_uom already exists for this product
    const baseCheckStmt = db.prepare(
      'SELECT 1 FROM product_uom WHERE product_id = ? AND is_base_unit = 1 LIMIT 1'
    )
    baseCheckStmt.bind([productId])
    const hasBase = baseCheckStmt.step()
    baseCheckStmt.free()

    if (!hasBase) {
      const id = randomUUID()
      db.run(
        'INSERT INTO product_uom (id, product_id, uom_id, conversion_factor, is_base_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, productId, uomId, 1, 1, now, now]
      )
    }
  }
  productStmt.free()

  // Backfill store_product_uom_price from product_price
  const priceStmt = db.prepare(
    'SELECT id, product_id, store_id, price FROM product_price WHERE deleted_at IS NULL'
  )
  while (priceStmt.step()) {
    const row = priceStmt.getAsObject()
    const productId = row.product_id as string
    const storeId = row.store_id as string
    const price = row.price as string

    // Find base UOM for this product
    const baseUomStmt = db.prepare(
      'SELECT uom_id FROM product_uom WHERE product_id = ? AND is_base_unit = 1 LIMIT 1'
    )
    baseUomStmt.bind([productId])
    let baseUomId: string | null = null
    if (baseUomStmt.step()) {
      const baseRow = baseUomStmt.getAsObject()
      baseUomId = baseRow.uom_id as string
    }
    baseUomStmt.free()

    if (!baseUomId) continue

    // Seed store-specific RETAIL price for base UOM
    const storePriceId = randomUUID()
    db.run(
      'INSERT OR IGNORE INTO store_product_uom_price (id, product_id, uom_id, price_category_id, store_id, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [storePriceId, productId, baseUomId, retailCategoryId, storeId, price, now, now]
    )

    // Also seed HQ default RETAIL price for base UOM, if not already present
    const hqPriceId = randomUUID()
    db.run(
      'INSERT OR IGNORE INTO product_uom_category_price (id, product_id, uom_id, price_category_id, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [hqPriceId, productId, baseUomId, retailCategoryId, price, now, now]
    )
  }
  priceStmt.free()

  saveDb(db)
}

/**
 * Seed point settings tables and default configuration
 */
export async function seedPointSettings(db: Database): Promise<void> {
  const now = SEED_TIMESTAMP

  // Create point_setting table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS point_setting (
      id TEXT PRIMARY KEY,
      point_per_rupiah TEXT NOT NULL DEFAULT '0.01',
      min_transaction TEXT NOT NULL DEFAULT '0',
      redemption_value TEXT NOT NULL DEFAULT '10',
      min_redemption INTEGER NOT NULL DEFAULT 100,
      max_redemption_percent INTEGER NOT NULL DEFAULT 50,
      expiry_months INTEGER NOT NULL DEFAULT 12,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER
    )
  `)

  // Create point_history table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS point_history (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      transaction_id TEXT,
      type TEXT NOT NULL,
      points INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      notes TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  // Add total_points column to customer if not exists
  try {
    db.run('ALTER TABLE customer ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0')
  } catch {
    // Column might already exist, ignore error
  }

  // Insert default point settings if not exists
  db.run(`
    INSERT OR IGNORE INTO point_setting (
      id, point_per_rupiah, min_transaction, redemption_value,
      min_redemption, max_redemption_percent, expiry_months,
      is_active, created_at, updated_at
    ) VALUES (
      'default', '0.01', '0', '10', 100, 50, 12, 1, ${now}, ${now}
    )
  `)

  saveDb(db)
  console.log('✓ Point settings tables seeded')
}

export async function seedReturnTables(db: Database): Promise<void> {
  // transaction_return table
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_return (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      return_number TEXT NOT NULL,
      store_id TEXT NOT NULL,
      total_refund TEXT NOT NULL,
      reason TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
  `)

  // transaction_return_item table
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_return_item (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      transaction_item_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      refund_price TEXT NOT NULL,
      restock INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      FOREIGN KEY (return_id) REFERENCES transaction_return(id),
      FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
    )
  `)

  // Migration: Add columns to transaction_return_item if missing
  try {
    db.run(`ALTER TABLE transaction_return_item ADD COLUMN synced_at INTEGER`)
  } catch {
    /* ignore */
  }
  try {
    db.run(`ALTER TABLE transaction_return_item ADD COLUMN deleted_at INTEGER`)
  } catch {
    /* ignore */
  }

  saveDb(db)
  console.log('✓ Return tables seeded')
}

interface SeedExpenseCategory {
  code: string
  name: string
  type: 'shift' | 'operational'
}

const expenseCategorySeed: SeedExpenseCategory[] = [
  { code: 'KASIR', name: 'Pengeluaran Kasir', type: 'shift' },
  { code: 'GAJI', name: 'Gaji Karyawan', type: 'operational' },
  { code: 'LISTRIK', name: 'Listrik & Air', type: 'operational' },
  { code: 'SEWA', name: 'Sewa Tempat', type: 'operational' },
  { code: 'TRANSPORT', name: 'Transportasi', type: 'operational' },
  { code: 'LAINNYA', name: 'Lain-lain', type: 'operational' }
]

/**
 * Seed default expense categories
 */
export async function seedExpenseCategories(db: Database): Promise<void> {
  // Create table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS expense_category (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'operational',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced_at INTEGER,
      deleted_at INTEGER,
      device_id TEXT
    )
  `)

  const now = SEED_TIMESTAMP

  for (const cat of expenseCategorySeed) {
    const existing = db.exec(`SELECT id FROM expense_category WHERE code = '${cat.code}'`)
    if (existing.length === 0 || existing[0].values.length === 0) {
      const id = randomUUID()
      db.run(
        'INSERT INTO expense_category (id, code, name, type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [id, cat.code, cat.name, cat.type, now, now]
      )
    }
  }

  // Migration: Add columns to expenses table if missing
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN category_id TEXT`)
  } catch {
    /* ignore */
  }
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN store_id TEXT`)
  } catch {
    /* ignore */
  }
  try {
    db.run(`ALTER TABLE expenses ADD COLUMN device_id TEXT`)
  } catch {
    /* ignore */
  }

  saveDb(db)
  console.log('✓ Expense categories seeded')
}
