import { Database } from 'sql.js'
import { sessionStore } from '../session'

/**
 * Checks if a user has the required permission by querying the database directly.
 * This is used for backend enforcement of RBAC.
 * 
 * @param db - The local database instance
 * @param userId - The ID of the user attempting the action
 * @param requiredPermission - The permission key required (e.g., 'master.product.create')
 * @returns boolean - True if the user has the permission (or is Admin), false otherwise
 */
export function checkPermission(db: Database, userId: string, requiredPermission: string): boolean {
  try {
    // 1. Check if user is Admin (role-admin)
    const userRoleStmt = db.prepare('SELECT role_id FROM user_role WHERE user_id = ? AND deleted_at IS NULL')
    userRoleStmt.bind([userId])
    const roleIds: string[] = []
    while (userRoleStmt.step()) {
      const row = userRoleStmt.getAsObject()
      roleIds.push(row.role_id as string)
    }
    userRoleStmt.free()

    if (roleIds.includes('role-admin')) {
      return true
    }

    if (roleIds.length === 0) return false

    // 2. Check if any of the user's roles have the required permission
    const placeholders = roleIds.map(() => '?').join(',')
    const query = `
      SELECT 1 
      FROM role_permission 
      WHERE permission_id = ? 
      AND role_id IN (${placeholders})
      AND deleted_at IS NULL
      LIMIT 1
    `
    
    const permStmt = db.prepare(query)
    permStmt.bind([requiredPermission, ...roleIds])
    const hasPerm = permStmt.step()
    permStmt.free()

    return hasPerm

  } catch (error) {
    console.error(`[AuthGuard] Error checking permission ${requiredPermission} for user ${userId}:`, error)
    return false
  }
}

/**
 * Higher-order function to wrap an IPC handler with a permission check.
 * 
 * @param db - The local database instance
 * @param permission - The permission key required
 * @param handler - The actual IPC handler function
 * @param options - Optional configuration (e.g., allowDuringSetup)
 */
export function requirePermission(
  db: Database,
  permission: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>,
  options: { allowDuringSetup?: boolean } = {}
) {
  return async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
    // 1. Bypass check if allowed during setup AND app is not yet configured
    if (options.allowDuringSetup) {
      try {
        const stmt = db.prepare("SELECT value FROM app_config WHERE key = 'is_configured'")
        let isConfigured = false
        if (stmt.step()) {
          const row = stmt.getAsObject()
          isConfigured = row.value === 'true'
        }
        stmt.free()


        if (!isConfigured) {
          // Allow access during initial setup flow
          return handler(event, ...args)
        }
      } catch (err) {
        // Table might not exist yet during very first bootstrap
        return handler(event, ...args)
      }
    }

    // 2. Standard session check
    const userId = sessionStore.getUserId()
    console.log(`[AuthGuard] requirePermission for ${permission}: current userId is ${userId} (Instance: ${sessionStore.getInstanceId()})`)
    
    if (!userId) {
      throw new Error('Unauthorized: No active session')
    }

    // Check if user has permission
    const allowed = checkPermission(db, userId, permission)
    
    if (!allowed) {
      console.warn(`[AuthGuard] Access denied for user ${userId} to ${permission}`)
      throw new Error(`Forbidden: Missing permission ${permission}`)
    }
    
    return handler(event, ...args)
  }
}
