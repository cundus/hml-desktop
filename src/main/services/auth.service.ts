import { Database } from 'sql.js'

export interface AuthResult {
  token: string
  userName: string
  userRole: string
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

    return {
      token: userId,
      userName,
      userRole: roleNames.join(', ') || 'User',
      groups: roleIds,
      permissions
    }
  }
}
