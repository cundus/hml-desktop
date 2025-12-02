import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

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

export interface CreateUomDto {
  code: string
  name: string
}

export interface UpdateUomDto {
  code?: string
  name?: string
}

export class UomService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) UOMs
   */
  async findAll(): Promise<Uom[]> {
    const stmt = this.db.prepare('SELECT * FROM uom WHERE deleted_at IS NULL ORDER BY code ASC')
    const results: Uom[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToUom(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get UOM by ID
   */
  async findById(id: string): Promise<Uom | undefined> {
    const stmt = this.db.prepare('SELECT * FROM uom WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToUom(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get UOM by code
   */
  async findByCode(code: string): Promise<Uom | undefined> {
    const stmt = this.db.prepare('SELECT * FROM uom WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToUom(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new UOM
   */
  async create(data: CreateUomDto): Promise<Uom> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run('INSERT INTO uom (id, code, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      id,
      data.code.toUpperCase(),
      data.name,
      now,
      now
    ])

    saveDb(this.db)

    return {
      id,
      code: data.code.toUpperCase(),
      name: data.name,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update UOM
   */
  async update(id: string, data: UpdateUomDto): Promise<Uom> {
    const now = Date.now()
    const updates: string[] = []
    const values: any[] = []

    if (data.code !== undefined) {
      updates.push('code = ?')
      values.push(data.code.toUpperCase())
    }
    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }

    updates.push('updated_at = ?')
    values.push(now)
    values.push(id)

    this.db.run(`UPDATE uom SET ${updates.join(', ')} WHERE id = ?`, values)

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('UOM not found after update')
    }
    return updated
  }

  /**
   * Soft delete UOM
   */
  async softDelete(id: string): Promise<Uom> {
    const now = Date.now()

    this.db.run('UPDATE uom SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('UOM not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted UOM
   */
  async restore(id: string): Promise<Uom> {
    const now = Date.now()

    this.db.run('UPDATE uom SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('UOM not found after restore')
    }
    return restored
  }

  /**
   * Map database row to Uom object
   */
  private mapRowToUom(row: any): Uom {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
