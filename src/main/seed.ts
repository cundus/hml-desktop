import { Database } from 'sql.js'
import { saveDb } from './localDb'
import { randomUUID } from 'crypto'

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
  { id: 'dashboard.view', name: 'View dashboard' },
  { id: 'sales.view', name: 'Use sales screen' },
  { id: 'sales.pos', name: 'Use point of sale' },
  { id: 'sales.reports', name: 'View sales reports' },
  { id: 'sales.manage', name: 'Manage sales' },
  { id: 'inventory.manage', name: 'Manage inventory' },
  { id: 'inventory.dashboard', name: 'View inventory dashboard' },
  { id: 'inventory.stocks', name: 'Manage stocks' },
  { id: 'inventory.stock-opname', name: 'Manage stock opname' },
  { id: 'inventory.batches', name: 'Manage batches' },
  { id: 'inventory.transactions', name: 'Manage stock transactions' },
  { id: 'purchasing.manage', name: 'Manage purchasing' },
  { id: 'operations.manage', name: 'Manage operations' },
  { id: 'operations.expenses', name: 'Manage expenses' },
  { id: 'operations.shift_history', name: 'View shift history' },
  { id: 'operations.supplies', name: 'Manage supplies purchasing' },
  { id: 'pricing.manage', name: 'Manage pricing' },
  { id: 'pricing.products', name: 'Manage product pricing' },
  { id: 'pricing.categories', name: 'Manage pricing categories' },
  { id: 'finance.view', name: 'View finance module' },
  { id: 'finance.cashflow', name: 'View cash flow reports' },
  { id: 'finance.reports', name: 'View financial reports' },
  { id: 'finance.profit-loss', name: 'View profit & loss reports' },
  { id: 'settings.view', name: 'View settings' },
  { id: 'master.branch.manage', name: 'Manage branches' },
  { id: 'master.user.manage', name: 'Manage users' },
  { id: 'master.customer.manage', name: 'Manage customers' },
  { id: 'master.product.manage', name: 'Manage products' },
  { id: 'master.category.manage', name: 'Manage categories' },
  { id: 'master.supplier.manage', name: 'Manage suppliers' },
  { id: 'master.store.manage', name: 'Manage stores' },
  { id: 'master.customer-category.manage', name: 'Manage customer categories' },
  { id: 'master.uom.manage', name: 'Manage units of measure' },
  { id: 'settings.access-control.manage', name: 'Manage roles & permissions' },
  { id: 'settings.app-config.manage', name: 'Manage app configuration' },
  { id: 'settings.printer.manage', name: 'Manage printer settings' }
]

/**
 * Reset and reseed permissions - deletes existing permissions and role_permissions, then reseeds.
 * Use this to fix duplicate permissions or permission catalog changes.
 */
export async function resetAndReseedPermissions(db: Database): Promise<void> {
  const now = Date.now()

  // Delete existing permissions and role mappings
  db.run('DELETE FROM role_permission')
  db.run('DELETE FROM permission')

  // Insert fresh permissions
  for (const perm of permissionCatalog) {
    db.run(
      'INSERT INTO permission (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [perm.id, perm.name, perm.description ?? null, now, now]
    )
  }

  // Re-grant all permissions to admin role
  const adminRoleId = 'role-admin'
  for (const perm of permissionCatalog) {
    const rpId = `role-admin:${perm.id}`
    db.run(
      'INSERT INTO role_permission (id, role_id, permission_id, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
      [rpId, adminRoleId, perm.id, now, now]
    )
  }

  saveDb(db)
}

const priceCategoryCatalog: SeedPriceCategory[] = [
  { id: 'RETAIL', name: 'Retail' },
  { id: 'WHOLESALE', name: 'Grosir' },
  { id: 'MEMBER', name: 'Member' }
]

export async function seedPriceCategories(db: Database): Promise<void> {
  const now = Date.now()

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
  const now = Date.now()

  for (const perm of permissionCatalog) {
    db.run(
      'INSERT OR IGNORE INTO permission (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [perm.id, perm.name, perm.description ?? null, now, now]
    )
  }

  saveDb(db)
}

/**
 * Seed a default admin role and user with full permissions.
 * - Role: id 'role-admin', name 'Admin'
 * - User: id 'user-admin', name 'Admin', email 'admin@example.com', password 'admin123'
 * - Grants all permissions from permissionCatalog to role-admin
 * - Assigns role-admin to user-admin
 * All operations are idempotent.
 */
export async function seedAdmin(db: Database): Promise<void> {
  const now = Date.now()

  const adminRoleId = 'role-admin'
  const adminUserId = 'user-admin'

  // Ensure admin role exists
  db.run(
    'INSERT OR IGNORE INTO role (id, name, description, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
    [adminRoleId, 'Admin', 'Default administrator role with full access', now, now]
  )

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

  // Grant all permissions to admin role
  for (const perm of permissionCatalog) {
    const rpId = `role-admin:${perm.id}`
    db.run(
      'INSERT OR IGNORE INTO role_permission (id, role_id, permission_id, created_at, updated_at, synced_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)',
      [rpId, adminRoleId, perm.id, now, now]
    )
  }

  saveDb(db)
}

/**
 * Default units of measure catalog
 */
const uomCatalog: SeedUom[] = [
  { code: 'PCS', name: 'Pieces' },
  { code: 'SAK', name: 'Sak/Karung' },
  { code: 'BOX', name: 'Box' },
  { code: 'DUS', name: 'Dus/Karton' },
  { code: 'PACK', name: 'Pack' },
  { code: 'KG', name: 'Kilogram' },
  { code: 'GR', name: 'Gram' },
  { code: 'LTR', name: 'Liter' },
  { code: 'ML', name: 'Mililiter' },
  { code: 'BTL', name: 'Botol' },
  { code: 'SET', name: 'Set' },
  { code: 'ROLL', name: 'Roll' },
  { code: 'MTR', name: 'Meter' }
]

/**
 * Seed the UOM table with default units.
 * This is idempotent: uses INSERT OR IGNORE on uom.code.
 */
export async function seedUoms(db: Database): Promise<void> {
  const now = Date.now()

  for (const uom of uomCatalog) {
    const id = randomUUID()
    db.run(
      'INSERT OR IGNORE INTO uom (id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, uom.code, uom.name, now, now]
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
  const now = Date.now()

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
