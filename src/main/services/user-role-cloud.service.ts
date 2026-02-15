import { Database } from 'sql.js'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

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

export class UserRoleCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<UserRole[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM user_role WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[UserRoleCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): UserRole[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM user_role WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: UserRole[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByUserId(userId: string): Promise<UserRole[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM user_role WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
          [userId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[UserRoleCloud] findByUserId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM user_role WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
    )
    stmt.bind([userId])
    const results: UserRole[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async setRolesForUser(userId: string, roleIds: string[]): Promise<UserRole[]> {
    const now = new Date()

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        // Soft-delete existing
        await pool.query(
          'UPDATE user_role SET deleted_at = $1, updated_at = $2 WHERE user_id = $3 AND deleted_at IS NULL',
          [now, now, userId]
        )
        // Insert new
        for (const roleId of roleIds) {
          const id = `${userId}:${roleId}`
          await pool.query(
            'INSERT INTO user_role (id, user_id, role_id, created_at, updated_at, deleted_at) ' +
              'VALUES ($1, $2, $3, $4, $5, NULL) ' +
              'ON CONFLICT (id) DO UPDATE SET deleted_at = NULL, updated_at = $5',
            [id, userId, roleId, now, now]
          )
        }
        return this.findByUserId(userId)
      } catch (error) {
        console.error('[UserRoleCloud] setRolesForUser error, queuing:', error)
      }
    }

    // Local fallback
    this.localDb.run(
      'UPDATE user_role SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL',
      [now.getTime(), now.getTime(), userId]
    )
    for (const roleId of roleIds) {
      const id = `${userId}:${roleId}`
      this.localDb.run(
        'INSERT OR REPLACE INTO user_role (id, user_id, role_id, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL)',
        [id, userId, roleId, now.getTime(), now.getTime()]
      )
    }
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'user_role', { user_id: userId, role_ids: roleIds })
    return this.findByUserId(userId)
  }

  private mapCloudRow(row: Record<string, unknown>): UserRole {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      roleId: row.role_id as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): UserRole {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      roleId: row.role_id as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
