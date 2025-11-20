import { Database } from 'sql.js'
import { CreateSupplierDto, UpdateSupplierDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class SupplierService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) suppliers
   */
  async findAll(): Promise<Supplier[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM supplier WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Supplier[] = []
    
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToSupplier(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get supplier by ID
   */
  async findById(id: string): Promise<Supplier | undefined> {
    const stmt = this.db.prepare('SELECT * FROM supplier WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToSupplier(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new supplier
   */
  async create(data: CreateSupplierDto): Promise<Supplier> {
    const id = randomUUID()
    const now = Date.now()
    
    this.db.run(
      'INSERT INTO supplier (id, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.name, data.phone ?? null, data.address ?? null, now, now]
    )
    
    saveDb(this.db)
    
    return {
      id,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update supplier
   */
  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE supplier SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?',
      [data.name, data.phone ?? null, data.address ?? null, now, id]
    )
    
    saveDb(this.db)
    
    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Supplier not found after update')
    }
    return updated
  }

  /**
   * Soft delete supplier
   */
  async softDelete(id: string): Promise<Supplier> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE supplier SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    )
    
    saveDb(this.db)
    
    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Supplier not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted supplier
   */
  async restore(id: string): Promise<Supplier> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE supplier SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    )
    
    saveDb(this.db)
    
    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Supplier not found after restore')
    }
    return restored
  }

  /**
   * Map database row to Supplier object
   */
  private mapRowToSupplier(row: any): Supplier {
    return {
      id: row.id as string,
      name: row.name as string,
      phone: row.phone as string | null,
      address: row.address as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
