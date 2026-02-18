import { Database } from 'sql.js'
import { sessionStore } from '../session'

export interface AuthResult {
  token: string
  userName: string
  userRole: string
  storeId: string | null
  storeName: string | null
  groups: string[]
  permissions: string[]
}

export class AuthService {
  constructor(private db: Database) {}

  async login(identifier: string, password: string): Promise<AuthResult> {
    // Find user by email OR name & password (plain-text for local-only dev)
    const stmt = this.db.prepare(
      'SELECT * FROM user WHERE (email = ? OR name = ?) AND password = ? AND deleted_at IS NULL'
    )
    stmt.bind([identifier, identifier, password])

    let user: any | null = null
    if (stmt.step()) {
      user = stmt.getAsObject()
    }
    stmt.free()

    if (!user) {
      throw new Error('Invalid email or password')
    }

    const userId = user.id as string
    const userName = user.name as string
    const storeId = (user.store_id as string) || null

    // Load roles for the user
    const roleIds: string[] = []
    const roleNames: string[] = []
    const rolesStmt = this.db.prepare(
      `SELECT ur.role_id, r.name as role_name
       FROM user_role ur
       LEFT JOIN role r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND ur.deleted_at IS NULL`
    )
    rolesStmt.bind([userId])
    while (rolesStmt.step()) {
      const row = rolesStmt.getAsObject()
      roleIds.push(row.role_id as string)
      if (row.role_name) {
        roleNames.push(row.role_name as string)
      }
    }
    rolesStmt.free()

    // Load permissions for all roles
    const permSet = new Set<string>()
    for (const roleId of roleIds) {
      const rpStmt = this.db.prepare(
        'SELECT permission_id FROM role_permission WHERE role_id = ? AND deleted_at IS NULL'
      )
      rpStmt.bind([roleId])
      while (rpStmt.step()) {
        const row = rpStmt.getAsObject()
        permSet.add(row.permission_id as string)
      }
      rpStmt.free()
    }

    const permissions = Array.from(permSet)

    const storeStmt = this.db.prepare('SELECT * FROM store WHERE id = ? AND deleted_at IS NULL')
    storeStmt.bind([storeId])
    let store: any | null = null
    if (storeStmt.step()) {
      store = storeStmt.getAsObject()
    }
    storeStmt.free()

    // Set current user in main process session
    sessionStore.setUser(userId, roleNames.join(', '))

    return {
      token: userId,
      userName,
      userRole: roleNames.join(', ') || 'User',
      storeId,
      storeName: store?.name || null,
      groups: roleIds,
      permissions
    }
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT pin FROM user WHERE id = ? AND deleted_at IS NULL')
    stmt.bind([userId])

    let userPin: string | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject()
      userPin = (row.pin as string) || null
    }
    stmt.free()

    // If user has no PIN set, any PIN is valid (for backward compatibility)
    if (!userPin) {
      return true
    }

    return userPin === pin
  }

  async authorize(pin: string, permission: string): Promise<{ success: boolean; userName?: string }> {
    // Find any user that matches this PIN and has the required permission
    const stmt = this.db.prepare(
      'SELECT id, name FROM user WHERE pin = ? AND deleted_at IS NULL'
    )
    stmt.bind([pin])

    const matchingUsers: { id: string; name: string }[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      matchingUsers.push({ id: row.id as string, name: row.name as string })
    }
    stmt.free()

    if (matchingUsers.length === 0) {
      return { success: false }
    }

    // For each matching user, check if they have the permission
    for (const user of matchingUsers) {
      // Load roles for the user
      const rolesStmt = this.db.prepare(
        'SELECT role_id FROM user_role WHERE user_id = ? AND deleted_at IS NULL'
      )
      rolesStmt.bind([user.id])
      const roleIds: string[] = []
      while (rolesStmt.step()) {
        roleIds.push(rolesStmt.getAsObject().role_id as string)
      }
      rolesStmt.free()

      // Check permissions
      for (const roleId of roleIds) {
        const rpStmt = this.db.prepare(
          'SELECT 1 FROM role_permission WHERE role_id = ? AND permission_id = ? AND deleted_at IS NULL'
        )
        rpStmt.bind([roleId, permission])
        const hasPerm = rpStmt.step()
        rpStmt.free()

        if (hasPerm) {
          return { success: true, userName: user.name }
        }
      }

      // Special case: if user is SUPERADMIN (if that role exists by name)
      const superAdminStmt = this.db.prepare(
        "SELECT 1 FROM user_role ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = ? AND r.name = 'SUPERADMIN' AND ur.deleted_at IS NULL"
      )
      superAdminStmt.bind([user.id])
      const isSuper = superAdminStmt.step()
      superAdminStmt.free()
      if (isSuper) {
        return { success: true, userName: user.name }
      }
    }

    return { success: false }
  }
}
