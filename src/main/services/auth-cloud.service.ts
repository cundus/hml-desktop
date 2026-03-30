import { Database } from 'sql.js'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { AuditLogService } from './audit-log.service'
import { AppConfigService } from './app-config.service'
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

export class AuthCloudService {
  constructor(
    private db: Database,
    private appConfigService: AppConfigService,
    private auditLogService?: AuditLogService
  ) {}

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async login(identifier: string, password: string): Promise<AuthResult> {
    // Try cloud first
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()

        // Find user
        const userResult = await pool.query(
          'SELECT * FROM "user" WHERE (email = $1 OR name = $1) AND password = $2 AND deleted_at IS NULL',
          [identifier, password]
        )

        if (userResult.rows.length === 0) {
          throw new Error('Invalid email or password')
        }

        const user = userResult.rows[0]
        const userId = user.id as string
        const userName = user.name as string
        const storeId = (user.store_id as string) || null

        // Load roles
        const rolesResult = await pool.query(
          `SELECT ur.role_id, r.name as role_name
           FROM user_role ur
           LEFT JOIN role r ON ur.role_id = r.id
           WHERE ur.user_id = $1 AND ur.deleted_at IS NULL`,
          [userId]
        )

        const roleIds = rolesResult.rows.map((r) => r.role_id as string)
        const roleNames = rolesResult.rows.map((r) => r.role_name as string).filter(Boolean)

        // Load permissions
        const permSet = new Set<string>()
        for (const roleId of roleIds) {
          const permResult = await pool.query(
            'SELECT permission_id FROM role_permission WHERE role_id = $1 AND deleted_at IS NULL',
            [roleId]
          )
          permResult.rows.forEach((r) => permSet.add(r.permission_id as string))
        }

        // Get store info
        let storeName: string | null = null
        if (storeId) {
          const storeResult = await pool.query(
            'SELECT name FROM store WHERE id = $1 AND deleted_at IS NULL',
            [storeId]
          )
          if (storeResult.rows.length > 0) {
            storeName = storeResult.rows[0].name as string
          }
        }


        if (this.auditLogService) {
          void this.auditLogService.log({
            action: 'LOGIN',
            entityType: 'user',
            entityId: userId,
            userId: userId,
            userName,
            storeId: storeId || undefined,
            storeName: storeName || undefined,
            metadata: { method: 'cloud', email: identifier }
          })
        }

        // Set current user in main process session
        sessionStore.setUser(userId, roleNames.join(', '))
        await this.appConfigService.setCurrentUser(userId)

        return {
          token: userId,
          userName,
          userRole: roleNames.join(', ') || 'User',
          storeId,
          storeName,
          groups: roleIds,
          permissions: Array.from(permSet)
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid email or password') {
          throw error
        }
        console.error('[AuthCloud] Cloud login failed, trying local:', error)
      }
    }

    // Fallback to local
    return this.loginLocal(identifier, password)
  }

  private async loginLocal(identifier: string, password: string): Promise<AuthResult> {
    const stmt = this.db.prepare(
      'SELECT * FROM user WHERE (email = ? OR name = ?) AND password = ? AND deleted_at IS NULL'
    )
    stmt.bind([identifier, identifier, password])

    let user: Record<string, unknown> | null = null
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

    // Load roles
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
      if (row.role_name) roleNames.push(row.role_name as string)
    }
    rolesStmt.free()

    // Load permissions
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

    // Get store
    let storeName: string | null = null
    if (storeId) {
      const storeStmt = this.db.prepare(
        'SELECT name FROM store WHERE id = ? AND deleted_at IS NULL'
      )
      storeStmt.bind([storeId])
      if (storeStmt.step()) {
        const row = storeStmt.getAsObject()
        storeName = row.name as string
      }
      storeStmt.free()
    }


    if (this.auditLogService) {
      void this.auditLogService.log({
        action: 'LOGIN',
        entityType: 'user',
        entityId: userId,
        userId: userId,
        userName,
        storeId: storeId || undefined,
        storeName: storeName || undefined,
        metadata: { method: 'local', email: identifier }
      })
    }

    // Set current user in main process session
    sessionStore.setUser(userId, roleNames.join(', '))
    await this.appConfigService.setCurrentUser(userId)

    return {
      token: userId,
      userName,
      userRole: roleNames.join(', ') || 'User',
      storeId,
      storeName,
      groups: roleIds,
      permissions: Array.from(permSet)
    }
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT pin FROM "user" WHERE id = $1 AND deleted_at IS NULL',
          [userId]
        )
        if (result.rows.length > 0) {
          const userPin = result.rows[0].pin as string | null
          if (!userPin) return true
          return userPin === pin
        }
      } catch (error) {
        console.error('[AuthCloud] verifyPin cloud error:', error)
      }
    }

    const stmt = this.db.prepare('SELECT pin FROM user WHERE id = ? AND deleted_at IS NULL')
    stmt.bind([userId])
    let userPin: string | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject()
      userPin = (row.pin as string) || null
    }
    stmt.free()

    if (!userPin) return true
    
    const isValid = userPin === pin
    if (isValid && this.auditLogService) {
      void this.auditLogService.log({
        action: 'LOGIN',
        entityType: 'user',
        entityId: userId,
        userId: userId,
        metadata: { method: 'pin' }
      })
    }
    
    return isValid
  }

  async restoreSession(): Promise<AuthResult | null> {
    try {
      const userId = await this.appConfigService.getCurrentUser()
      if (!userId) return null

      // Local DB lookup for speed and offline support
      const stmt = this.db.prepare('SELECT * FROM user WHERE id = ? AND deleted_at IS NULL')
      stmt.bind([userId])
      
      let user: Record<string, unknown> | null = null
      if (stmt.step()) {
        user = stmt.getAsObject()
      }
      stmt.free()

      if (!user) {
        // User might have been deleted or ID is invalid
        await this.appConfigService.clearCurrentUser()
        return null
      }

      const userName = user.name as string
      const storeId = (user.store_id as string) || null

      // Load roles
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
        if (row.role_name) roleNames.push(row.role_name as string)
      }
      rolesStmt.free()

      // Load permissions
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

      // Get store ID/Name
      let storeName: string | null = null
      if (storeId) {
        const storeStmt = this.db.prepare(
          'SELECT name FROM store WHERE id = ? AND deleted_at IS NULL'
        )
        storeStmt.bind([storeId])
        if (storeStmt.step()) {
          const row = storeStmt.getAsObject()
          storeName = row.name as string
        }
        storeStmt.free()
      }


      // Set current user in main process session
      sessionStore.setUser(userId, roleNames.join(', '))

      return {
        token: userId,
        userName,
        userRole: roleNames.join(', ') || 'User',
        storeId,
        storeName,
        groups: roleIds,
        permissions: Array.from(permSet)
      }

    } catch (error) {
      console.error('[AuthCloud] Failed to restore session:', error)
      return null
    }
  }

  async authorize(pin: string, permission: string): Promise<{ success: boolean; userName?: string }> {
    // supervisor PIN authorization is local-only for responsiveness and offline support
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

      // Special case: if user is SUPERADMIN
      const superAdminStmt = this.db.prepare(
        "SELECT 1 FROM user_role ur JOIN role r ON ur.role_id = r.id WHERE ur.user_id = ? AND (r.name = 'SUPERADMIN' OR r.id = 'role-admin') AND ur.deleted_at IS NULL"
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
