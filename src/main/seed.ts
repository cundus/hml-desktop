import { Database } from 'sql.js'
import { saveDb } from './localDb'

interface SeedPermission {
  id: string
  name: string
  description?: string
}

const permissionCatalog: SeedPermission[] = [
  { id: 'dashboard.view', name: 'View dashboard' },
  { id: 'sales.view', name: 'Use sales screen' },
  { id: 'settings.view', name: 'View settings' },
  { id: 'master.branch.manage', name: 'Manage branches' },
  { id: 'master.user.manage', name: 'Manage users' },
  { id: 'master.customer.manage', name: 'Manage customers' },
  { id: 'master.product.manage', name: 'Manage products' },
  { id: 'master.category.manage', name: 'Manage categories' },
  { id: 'master.supplier.manage', name: 'Manage suppliers' },
  { id: 'master.store.manage', name: 'Manage stores' },
  { id: 'master.customer-category.manage', name: 'Manage customer categories' },
  { id: 'settings.access-control.manage', name: 'Manage roles & permissions' },
  { id: 'warehouse.manage', name: 'Manage warehouse & stocks' },
  { id: 'inventory.dashboard', name: 'View inventory dashboard' },
  { id: 'inventory.pricing', name: 'Manage product pricing' },
  { id: 'inventory.batches', name: 'Manage batches' },
  { id: 'inventory.transactions', name: 'Manage stock transactions' },
  { id: 'sales.pos', name: 'Use point of sale' },
  { id: 'sales.reports', name: 'View sales reports' },
  { id: 'sales.manage', name: 'Manage sales' },
  { id: 'warehouse.stock-opname', name: 'Manage stock opname' },
  { id: 'warehouse.purchasing', name: 'Manage purchasing' },
  { id: 'warehouse.pricing', name: 'Manage pricing' },
  { id: 'warehouse.stocks', name: 'View stocks' },
  { id: 'warehouse.shipping', name: 'Manage shipping' },
  { id: 'warehouse.transfers', name: 'Manage transfers' }
]

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
