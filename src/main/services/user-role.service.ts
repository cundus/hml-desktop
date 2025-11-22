import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface UserRole {
  id: string
  userId: string
  roleId: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class UserRoleService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) user-role mappings
   */
  async findAll(): Promise<UserRole[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM user_role WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: UserRole[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToUserRole(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get all roles for a specific user
   */
  async findByUserId(userId: string): Promise<UserRole[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM user_role WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
    )
    stmt.bind([userId])

    const results: UserRole[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToUserRole(row))
    }
    stmt.free()

    return results
  }

  /**
   * Replace roles for a user with the given role IDs
   */
  async setRolesForUser(userId: string, roleIds: string[]): Promise<UserRole[]> {
    const now = Date.now()

    // Soft-delete existing mappings
    this.db.run(
      'UPDATE user_role SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL',
      [now, now, userId]
    )

    // Insert new mappings
    for (const roleId of roleIds) {
      const id = randomUUID()
      this.db.run(
        'INSERT INTO user_role (id, user_id, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, userId, roleId, now, now]
      )
    }

    saveDb(this.db)

    return this.findByUserId(userId)
  }

  /**
   * Map DB row to UserRole
   */
  private mapRowToUserRole(row: any): UserRole {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      roleId: row.role_id as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: (row.device_id as string) ?? null
    }
  }
}
