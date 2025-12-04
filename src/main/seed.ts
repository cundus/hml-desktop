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
  { id: 'settings.app-config.manage', name: 'Manage app configuration' }
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
