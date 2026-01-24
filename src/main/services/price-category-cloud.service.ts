import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface PriceCategory {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
export interface CreatePriceCategoryDto {
  id?: string
  name: string
  description?: string
  isDefault?: boolean
  sortOrder?: number
}
export interface UpdatePriceCategoryDto {
  name?: string
  description?: string
  isDefault?: boolean
  sortOrder?: number
}

export class PriceCategoryCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
    this.ensureTable()
  }

  private ensureTable(): void {
    try {
      this.localDb.run('ALTER TABLE price_category ADD COLUMN is_default INTEGER DEFAULT 0')
    } catch {
      /* exists */
    }
    try {
      this.localDb.run('ALTER TABLE price_category ADD COLUMN sort_order INTEGER DEFAULT 0')
    } catch {
      /* exists */
    }
    saveDb(this.localDb)
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async getAll(): Promise<PriceCategory[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM price_category WHERE deleted_at IS NULL ORDER BY sort_order ASC, name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[PriceCategoryCloud] getAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM price_category WHERE deleted_at IS NULL ORDER BY sort_order ASC, name ASC'
    )
    const results: PriceCategory[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async getById(id: string): Promise<PriceCategory | null> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM price_category WHERE id = $1 AND deleted_at IS NULL',
          [id]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[PriceCategoryCloud] getById error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM price_category WHERE id = ? AND deleted_at IS NULL LIMIT 1'
    )
    stmt.bind([id])
    if (stmt.step()) {
      const c = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return c
    }
    stmt.free()
    return null
  }

  async create(data: CreatePriceCategoryDto): Promise<PriceCategory> {
    const id = data.id || randomUUID()
    const now = new Date()
    const pc: PriceCategory = {
      id,
      name: data.name,
      description: data.description ?? null,
      isDefault: data.isDefault ?? false,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now
    }

    // Always save to local first
    this.localDb.run(
      'INSERT INTO price_category (id, name, description, is_default, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.name,
        pc.description,
        pc.isDefault ? 1 : 0,
        pc.sortOrder,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)

    // Also save to cloud if online
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO price_category (id, name, description, is_default, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, data.name, pc.description, pc.isDefault, pc.sortOrder, now, now]
        )
      } catch (error) {
        console.error('[PriceCategoryCloud] create cloud error, queuing:', error)
        // Queue for later sync if cloud insert failed
        await this.queueService.add('INSERT', 'price_category', {
          id,
          name: data.name,
          description: pc.description,
          is_default: pc.isDefault,
          sort_order: pc.sortOrder,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
      }
    } else {
      // Queue for later sync if offline
      await this.queueService.add('INSERT', 'price_category', {
        id,
        name: data.name,
        description: pc.description,
        is_default: pc.isDefault,
        sort_order: pc.sortOrder,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
    }

    return pc
  }

  async update(id: string, data: UpdatePriceCategoryDto): Promise<PriceCategory> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Price category not found')
    const now = new Date()
    const updated: PriceCategory = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      isDefault: data.isDefault ?? existing.isDefault,
      sortOrder: data.sortOrder ?? existing.sortOrder,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE price_category SET name = $1, description = $2, is_default = $3, sort_order = $4, updated_at = $5 WHERE id = $6',
          [updated.name, updated.description, updated.isDefault, updated.sortOrder, now, id]
        )
        return updated
      } catch (error) {
        console.error('[PriceCategoryCloud] update error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE price_category SET name = ?, description = ?, is_default = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [
        updated.name,
        updated.description,
        updated.isDefault ? 1 : 0,
        updated.sortOrder,
        now.getTime(),
        id
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'price_category', {
      id,
      name: updated.name,
      description: updated.description,
      is_default: updated.isDefault,
      sort_order: updated.sortOrder,
      updated_at: now.toISOString()
    })
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Price category not found')
    if (existing.isDefault) throw new Error('Cannot delete default price category')
    const now = new Date()

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE price_category SET deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
      } catch (error) {
        console.error('[PriceCategoryCloud] delete error:', error)
      }
    }

    this.localDb.run('UPDATE price_category SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
  }

  private mapCloudRow(row: Record<string, unknown>): PriceCategory {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      isDefault: row.is_default === true,
      sortOrder: parseInt(row.sort_order as string) || 0,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    }
  }

  private mapLocalRow(row: Record<string, unknown>): PriceCategory {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      isDefault: row.is_default === 1,
      sortOrder: (row.sort_order as number) || 0,
      createdAt: new Date((row.created_at as number) || 0),
      updatedAt: new Date((row.updated_at as number) || 0)
    }
  }
}
