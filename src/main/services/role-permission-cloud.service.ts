import { Database } from 'sql.js'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

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

export class RolePermissionCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<RolePermission[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM role_permission WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[RolePermissionCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): RolePermission[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM role_permission WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: RolePermission[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM role_permission WHERE role_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
          [roleId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[RolePermissionCloud] findByRoleId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM role_permission WHERE role_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
    )
    stmt.bind([roleId])
    const results: RolePermission[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async setPermissionsForRole(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    const now = new Date()

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE role_permission SET deleted_at = $1, updated_at = $2 WHERE role_id = $3 AND deleted_at IS NULL',
          [now, now, roleId]
        )
        for (const permissionId of permissionIds) {
          const id = `${roleId}:${permissionId}`
          await pool.query(
            'INSERT INTO role_permission (id, role_id, permission_id, created_at, updated_at, deleted_at) ' +
              'VALUES ($1, $2, $3, $4, $5, NULL) ' +
              'ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = $5',
            [id, roleId, permissionId, now, now]
          )
        }
        return this.findByRoleId(roleId)
      } catch (error) {
        console.error('[RolePermissionCloud] setPermissionsForRole error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE role_permission SET deleted_at = ?, updated_at = ? WHERE role_id = ? AND deleted_at IS NULL',
      [now.getTime(), now.getTime(), roleId]
    )
    for (const permissionId of permissionIds) {
      const id = `${roleId}:${permissionId}`
      this.localDb.run(
        'INSERT OR REPLACE INTO role_permission (id, role_id, permission_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
        [id, roleId, permissionId, now.getTime(), now.getTime()]
      )
    }
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'role_permission', {
      role_id: roleId,
      permission_ids: permissionIds
    })
    return this.findByRoleId(roleId)
  }

  private mapCloudRow(row: Record<string, unknown>): RolePermission {
    return {
      id: row.id as string,
      roleId: row.role_id as string,
      permissionId: row.permission_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): RolePermission {
    return {
      id: row.id as string,
      roleId: row.role_id as string,
      permissionId: row.permission_id as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
