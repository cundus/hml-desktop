import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Uom {
  id: string
  code: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export interface CreateUomDto { code: string; name: string }
export interface UpdateUomDto { code?: string; name?: string }

export class UomCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'uom'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Uom[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM uom WHERE deleted_at IS NULL ORDER BY code ASC')
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) {
        console.error('[UomCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Uom[] {
    const stmt = this.localDb.prepare('SELECT * FROM uom WHERE deleted_at IS NULL ORDER BY code ASC')
    const results: Uom[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Uom | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM uom WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[UomCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Uom | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM uom WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) { const u = this.mapLocalRow(stmt.getAsObject()); stmt.free(); return u }
    stmt.free()
    return undefined
  }

  async findByCode(code: string): Promise<Uom | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM uom WHERE code = $1 AND deleted_at IS NULL', [code])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[UomCloud] findByCode error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM uom WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    if (stmt.step()) { const u = this.mapLocalRow(stmt.getAsObject()); stmt.free(); return u }
    stmt.free()
    return undefined
  }

  async create(data: CreateUomDto): Promise<Uom> {
    const id = randomUUID()
    const now = new Date()
    const code = data.code.toUpperCase()

    const uom: Uom = { id, code, name: data.name, createdAt: now, updatedAt: now, syncedAt: null, deletedAt: null, deviceId: null }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('INSERT INTO uom (id, code, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          [id, code, data.name, now, now])
        console.log('[UomCloud] Created in cloud:', id)
        return uom
      } catch (error) {
        console.error('[UomCloud] create error, queuing:', error)
      }
    }

    this.localDb.run('INSERT INTO uom (id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, code, data.name, now.getTime(), now.getTime()])
    saveDb(this.localDb)
    await this.queueService.add('INSERT', this.tableName, { id, code, name: data.name, created_at: now.toISOString(), updated_at: now.toISOString() })
    return uom
  }

  async update(id: string, data: UpdateUomDto): Promise<Uom> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('UOM not found')

    const now = new Date()
    const updated: Uom = {
      ...existing,
      code: data.code ? data.code.toUpperCase() : existing.code,
      name: data.name ?? existing.name,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE uom SET code = $1, name = $2, updated_at = $3 WHERE id = $4',
          [updated.code, updated.name, now, id])
        return updated
      } catch (error) {
        console.error('[UomCloud] update error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE uom SET code = ?, name = ?, updated_at = ? WHERE id = ?',
      [updated.code, updated.name, now.getTime(), id])
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', this.tableName, { id, code: updated.code, name: updated.name, updated_at: now.toISOString() })
    return updated
  }

  async softDelete(id: string): Promise<Uom> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('UOM not found')
    const now = new Date()
    const deleted: Uom = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE uom SET deleted_at = $1, updated_at = $2 WHERE id = $3', [now, now, id])
        return deleted
      } catch (error) {
        console.error('[UomCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE uom SET deleted_at = ?, updated_at = ? WHERE id = ?', [now.getTime(), now.getTime(), id])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Uom> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE uom SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [now, id])
      } catch (error) {
        console.error('[UomCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE uom SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now.getTime(), id])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('UOM not found after restore')
    return restored
  }

  private mapCloudRow(row: Record<string, unknown>): Uom {
    return {
      id: row.id as string, code: row.code as string, name: row.name as string,
      createdAt: new Date(row.created_at as string), updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Uom {
    return {
      id: row.id as string, code: row.code as string, name: row.name as string,
      createdAt: new Date(row.created_at as number), updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
