import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateUserDto, UpdateUserDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface User {
  id: string
  name: string
  email: string
  password: string
  pin: string | null
  storeId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class UserCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<User[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM "user" WHERE deleted_at IS NULL ORDER BY created_at DESC')
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) {
        console.error('[UserCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): User[] {
    const stmt = this.localDb.prepare('SELECT * FROM user WHERE deleted_at IS NULL ORDER BY created_at DESC')
    const results: User[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findById(id: string): Promise<User | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM "user" WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[UserCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): User | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM user WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const u = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return u
    }
    stmt.free()
    return undefined
  }

  async findByEmail(email: string): Promise<User | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM "user" WHERE email = $1 AND deleted_at IS NULL', [email])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[UserCloud] findByEmail error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM user WHERE email = ? AND deleted_at IS NULL')
    stmt.bind([email])
    if (stmt.step()) {
      const u = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return u
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateUserDto): Promise<User> {
    const id = randomUUID()
    const now = new Date()

    const user: User = {
      id, name: data.name, email: data.email, password: data.password,
      pin: null, storeId: data.storeId ?? null,
      createdAt: now, updatedAt: now, syncedAt: null, deletedAt: null, deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO "user" (id, name, email, password, store_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, data.name, data.email, data.password, data.storeId ?? null, now, now]
        )
        console.log('[UserCloud] Created in cloud:', id)
        return user
      } catch (error) {
        console.error('[UserCloud] create error, queuing:', error)
      }
    }

    this.saveToLocal(user)
    await this.queueService.add('INSERT', 'user', {
      id, name: data.name, email: data.email, password: data.password,
      store_id: data.storeId ?? null, created_at: now.toISOString(), updated_at: now.toISOString()
    })
    return user
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('User not found')

    const now = new Date()
    let storeId: string | null = existing.storeId
    if ('storeId' in data) {
      storeId = data.storeId && data.storeId.length > 0 ? data.storeId : null
    }

    const updated: User = {
      ...existing,
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      password: data.password ?? existing.password,
      storeId,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE "user" SET name = $1, email = $2, password = $3, store_id = $4, updated_at = $5 WHERE id = $6',
          [updated.name, updated.email, updated.password, updated.storeId, now, id]
        )
        console.log('[UserCloud] Updated in cloud:', id)
        return updated
      } catch (error) {
        console.error('[UserCloud] update error, queuing:', error)
      }
    }

    this.updateLocal(updated)
    await this.queueService.add('UPDATE', 'user', {
      id, name: updated.name, email: updated.email, password: updated.password,
      store_id: updated.storeId, updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<User> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('User not found')

    const now = new Date()
    const deleted: User = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE "user" SET deleted_at = $1, updated_at = $2 WHERE id = $3', [now, now, id])
        return deleted
      } catch (error) {
        console.error('[UserCloud] delete error, queuing:', error)
      }
    }

    this.deleteLocal(id, now)
    await this.queueService.add('DELETE', 'user', { id })
    return deleted
  }

  async hardDelete(id: string): Promise<void> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('DELETE FROM "user" WHERE id = $1', [id])
      } catch (error) {
        console.error('[UserCloud] hardDelete error:', error)
      }
    }
    this.localDb.run('DELETE FROM user WHERE id = ?', [id])
    saveDb(this.localDb)
  }

  async restore(id: string): Promise<User> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE "user" SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [now, id])
      } catch (error) {
        console.error('[UserCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE user SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now.getTime(), id])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('User not found after restore')
    return restored
  }

  async updatePin(id: string, pin: string | null): Promise<User> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('User not found')

    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE "user" SET pin = $1, updated_at = $2 WHERE id = $3', [pin, now, id])
      } catch (error) {
        console.error('[UserCloud] updatePin error:', error)
      }
    }
    this.localDb.run('UPDATE user SET pin = ?, updated_at = ? WHERE id = ?', [pin, now.getTime(), id])
    saveDb(this.localDb)
    const updated = await this.findById(id)
    if (!updated) throw new Error('User not found after update')
    return updated
  }

  async hasPin(id: string): Promise<boolean> {
    const user = await this.findById(id)
    return !!user?.pin
  }

  private saveToLocal(u: User): void {
    this.localDb.run(
      'INSERT OR REPLACE INTO user (id, name, email, password, store_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, u.password, u.storeId, u.createdAt.getTime(), u.updatedAt.getTime()]
    )
    saveDb(this.localDb)
  }

  private updateLocal(u: User): void {
    this.localDb.run('UPDATE user SET name = ?, email = ?, password = ?, store_id = ?, updated_at = ? WHERE id = ?',
      [u.name, u.email, u.password, u.storeId, u.updatedAt.getTime(), u.id])
    saveDb(this.localDb)
  }

  private deleteLocal(id: string, now: Date): void {
    this.localDb.run('UPDATE user SET deleted_at = ?, updated_at = ? WHERE id = ?', [now.getTime(), now.getTime(), id])
    saveDb(this.localDb)
  }

  private mapCloudRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string, name: row.name as string, email: row.email as string, password: row.password as string,
      pin: row.pin as string | null, storeId: row.store_id as string | null,
      createdAt: new Date(row.created_at as string), updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string, name: row.name as string, email: row.email as string, password: row.password as string,
      pin: row.pin as string | null, storeId: row.store_id as string | null,
      createdAt: new Date(row.created_at as number), updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
