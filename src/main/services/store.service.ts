import { Database } from 'sql.js'
import { CreateStoreDto, UpdateStoreDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Store {
  id: string
  code: string
  name: string
  address: string | null
  type: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class StoreService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) stores
   */
  async findAll(): Promise<Store[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM store WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Store[] = []
    
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToStore(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get store by ID
   */
  async findById(id: string): Promise<Store | undefined> {
    const stmt = this.db.prepare('SELECT * FROM store WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToStore(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get store by code
   */
  async findByCode(code: string): Promise<Store | undefined> {
    const stmt = this.db.prepare('SELECT * FROM store WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToStore(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new store
   */
  async create(data: CreateStoreDto): Promise<Store> {
    const id = randomUUID()
    const now = Date.now()
    
    this.db.run(
      'INSERT INTO store (id, code, name, address, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.code, data.name, data.address ?? null, data.type, now, now]
    )
    
    saveDb(this.db)
    
    return {
      id,
      code: data.code,
      name: data.name,
      address: data.address ?? null,
      type: data.type,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update store
   */
  async update(id: string, data: UpdateStoreDto): Promise<Store> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Store not found')
    }

    const now = Date.now()
    
    this.db.run(
      'UPDATE store SET code = ?, name = ?, address = ?, type = ?, updated_at = ? WHERE id = ?',
      [data.code ?? existing.code, data.name ?? existing.name, data.address ?? existing.address ?? null, data.type ?? existing.type, now, id]
    )
    
    saveDb(this.db)
    
    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Store not found after update')
    }
    return updated
  }

  /**
   * Soft delete store
   */
  async softDelete(id: string): Promise<Store> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE store SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    )
    
    saveDb(this.db)
    
    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Store not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted store
   */
  async restore(id: string): Promise<Store> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE store SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    )
    
    saveDb(this.db)
    
    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Store not found after restore')
    }
    return restored
  }

  /**
   * Map database row to Store object
   */
  private mapRowToStore(row: any): Store {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      address: row.address as string | null,
      type: row.type as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
