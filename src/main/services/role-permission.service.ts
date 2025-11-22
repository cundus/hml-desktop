import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class RolePermissionService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) role-permission mappings
   */
  async findAll(): Promise<RolePermission[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM role_permission WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: RolePermission[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToRolePermission(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get permissions for a specific role
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM role_permission WHERE role_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
    )
    stmt.bind([roleId])

    const results: RolePermission[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToRolePermission(row))
    }
    stmt.free()

    return results
  }

  /**
   * Replace permissions for a role with the given permission IDs
   */
  async setPermissionsForRole(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    const now = Date.now()

    // Soft-delete existing mappings
    this.db.run(
      'UPDATE role_permission SET deleted_at = ?, updated_at = ? WHERE role_id = ? AND deleted_at IS NULL',
      [now, now, roleId]
    )

    // Insert new mappings
    for (const permissionId of permissionIds) {
      const id = randomUUID()
      this.db.run(
        'INSERT INTO role_permission (id, role_id, permission_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, roleId, permissionId, now, now]
      )
    }

    saveDb(this.db)

    return this.findByRoleId(roleId)
  }

  /**
   * Map DB row to RolePermission
   */
  private mapRowToRolePermission(row: any): RolePermission {
    return {
      id: row.id as string,
      roleId: row.role_id as string,
      permissionId: row.permission_id as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: (row.device_id as string) ?? null
    }
  }
}
