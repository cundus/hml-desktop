import { Database } from 'sql.js'

export interface Permission {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class PermissionService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) permissions
   */
  async findAll(): Promise<Permission[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM permission WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Permission[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToPermission(row))
    }
    stmt.free()

    return results
  }

  /**
   * Map database row to Permission object
   */
  private mapRowToPermission(row: any): Permission {
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: (row.device_id as string) ?? null
    }
  }
}
