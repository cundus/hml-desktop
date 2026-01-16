import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateRoleDto, UpdateRoleDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Role {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class RoleCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'role'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Role[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM role WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[RoleCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Role[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM role WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Role[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Role | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM role WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[RoleCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Role | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM role WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const r = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return r
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateRoleDto): Promise<Role> {
    const id = randomUUID()
    const now = new Date()
    const role: Role = {
      id,
      name: data.name,
      description: data.description ?? null,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO role (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          [id, data.name, data.description ?? null, now, now]
        )
        return role
      } catch (error) {
        console.error('[RoleCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO role (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.description ?? null, now.getTime(), now.getTime()]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      name: data.name,
      description: data.description ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return role
  }

  async update(id: string, data: UpdateRoleDto): Promise<Role> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Role not found')

    const now = new Date()
    const updated: Role = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE role SET name = $1, description = $2, updated_at = $3 WHERE id = $4',
          [updated.name, updated.description, now, id]
        )
        return updated
      } catch (error) {
        console.error('[RoleCloud] update error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE role SET name = ?, description = ?, updated_at = ? WHERE id = ?', [
      updated.name,
      updated.description,
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      name: updated.name,
      description: updated.description,
      updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<Role> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Role not found')
    const now = new Date()
    const deleted: Role = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE role SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
          now,
          now,
          id
        ])
        return deleted
      } catch (error) {
        console.error('[RoleCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE role SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Role> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE role SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [
          now,
          id
        ])
      } catch (error) {
        console.error('[RoleCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE role SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Role not found after restore')
    return restored
  }

  private mapCloudRow(row: Record<string, unknown>): Role {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Role {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
