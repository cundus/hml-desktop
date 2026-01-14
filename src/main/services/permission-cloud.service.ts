import { Database } from 'sql.js'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'

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

// PermissionCloudService - Read-only service (permissions are seeded)
export class PermissionCloudService {
  constructor(private db: Database) {}

  private isOnline(): boolean { return getConnectivity().isOnline() }

  async findAll(): Promise<Permission[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM permission WHERE deleted_at IS NULL ORDER BY name ASC')
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) {
        console.error('[PermissionCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Permission[] {
    const stmt = this.db.prepare('SELECT * FROM permission WHERE deleted_at IS NULL ORDER BY name ASC')
    const results: Permission[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  private mapCloudRow(row: Record<string, unknown>): Permission {
    return {
      id: row.id as string, name: row.name as string, description: row.description as string | null,
      createdAt: new Date(row.created_at as string), updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Permission {
    return {
      id: row.id as string, name: row.name as string, description: row.description as string | null,
      createdAt: new Date(row.created_at as number), updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
