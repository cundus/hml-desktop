import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateStoreDto, UpdateStoreDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Store {
  id: string
  code: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  type: string
  defaultSalesId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

/**
 * StoreCloudService - Cloud-first store service
 */
export class StoreCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'store'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Store[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM store WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[StoreCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Store[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM store WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Store[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Store | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM store WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[StoreCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Store | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM store WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const s = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return s
    }
    stmt.free()
    return undefined
  }

  async findByCode(code: string): Promise<Store | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM store WHERE code = $1 AND deleted_at IS NULL',
          [code]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[StoreCloud] findByCode error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM store WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    if (stmt.step()) {
      const s = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return s
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateStoreDto): Promise<Store> {
    const id = randomUUID()
    const now = new Date()

    const store: Store = {
      id,
      code: data.code,
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      type: data.type,
      defaultSalesId: data.defaultSalesId ?? null,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO store (id, code, name, address, phone, email, type, default_sales_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [
            id,
            data.code,
            data.name,
            data.address ?? null,
            data.phone ?? null,
            data.email ?? null,
            data.type,
            data.defaultSalesId ?? null,
            now,
            now
          ]
        )
        console.log('[StoreCloud] Created in cloud:', id)
        return store
      } catch (error) {
        console.error('[StoreCloud] create error, queuing:', error)
      }
    }

    this.saveToLocal(store)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      code: data.code,
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      type: data.type,
      default_sales_id: data.defaultSalesId ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    console.log('[StoreCloud] Queued:', id)
    return store
  }

  async update(id: string, data: UpdateStoreDto): Promise<Store> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Store not found')

    const now = new Date()
    const updated: Store = {
      ...existing,
      code: data.code ?? existing.code,
      name: data.name ?? existing.name,
      address: data.address ?? existing.address,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      type: data.type ?? existing.type,
      defaultSalesId: data.defaultSalesId ?? existing.defaultSalesId,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE store SET code = $1, name = $2, address = $3, phone = $4, email = $5, type = $6, default_sales_id = $7, updated_at = $8 WHERE id = $9',
          [
            updated.code,
            updated.name,
            updated.address,
            updated.phone,
            updated.email,
            updated.type,
            updated.defaultSalesId,
            now,
            id
          ]
        )
        console.log('[StoreCloud] Updated in cloud:', id)
        return updated
      } catch (error) {
        console.error('[StoreCloud] update error, queuing:', error)
      }
    }

    this.updateLocal(updated)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      code: updated.code,
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      type: updated.type,
      default_sales_id: updated.defaultSalesId,
      updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<Store> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Store not found')

    const now = new Date()
    const deleted: Store = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE store SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
          now,
          now,
          id
        ])
        console.log('[StoreCloud] Deleted in cloud:', id)
        return deleted
      } catch (error) {
        console.error('[StoreCloud] delete error, queuing:', error)
      }
    }

    this.deleteLocal(id, now)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Store> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE store SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [
          now,
          id
        ])
      } catch (error) {
        console.error('[StoreCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE store SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Store not found after restore')
    return restored
  }

  // Local helpers
  private saveToLocal(s: Store): void {
    this.localDb.run(
      'INSERT OR REPLACE INTO store (id, code, name, address, phone, email, type, default_sales_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        s.id,
        s.code,
        s.name,
        s.address,
        s.phone,
        s.email,
        s.type,
        s.defaultSalesId,
        s.createdAt.getTime(),
        s.updatedAt.getTime()
      ]
    )
    saveDb(this.localDb)
  }

  private updateLocal(s: Store): void {
    this.localDb.run(
      'UPDATE store SET code = ?, name = ?, address = ?, phone = ?, email = ?, type = ?, default_sales_id = ?, updated_at = ? WHERE id = ?',
      [
        s.code,
        s.name,
        s.address,
        s.phone,
        s.email,
        s.type,
        s.defaultSalesId,
        s.updatedAt.getTime(),
        s.id
      ]
    )
    saveDb(this.localDb)
  }

  private deleteLocal(id: string, now: Date): void {
    this.localDb.run('UPDATE store SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
  }

  // Mappers
  private mapCloudRow(row: Record<string, unknown>): Store {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      address: row.address as string | null,
      phone: row.phone as string | null,
      email: row.email as string | null,
      type: row.type as string,
      defaultSalesId: row.default_sales_id as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Store {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      address: row.address as string | null,
      phone: row.phone as string | null,
      email: row.email as string | null,
      type: row.type as string,
      defaultSalesId: row.default_sales_id as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
