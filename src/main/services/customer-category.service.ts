import { Database } from 'sql.js'
import { CreateCustomerCategoryDto, UpdateCustomerCategoryDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface CustomerCategory {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class CustomerCategoryService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) customer categories
   */
  async findAll(): Promise<CustomerCategory[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM customer_category WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: CustomerCategory[] = []
    
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToCustomerCategory(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get customer category by ID
   */
  async findById(id: string): Promise<CustomerCategory | undefined> {
    const stmt = this.db.prepare('SELECT * FROM customer_category WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToCustomerCategory(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new customer category
   */
  async create(data: CreateCustomerCategoryDto): Promise<CustomerCategory> {
    const id = randomUUID()
    const now = Date.now()
    
    this.db.run(
      'INSERT INTO customer_category (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, data.name, now, now]
    )
    
    saveDb(this.db)
    
    return {
      id,
      name: data.name,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update customer category
   */
  async update(id: string, data: UpdateCustomerCategoryDto): Promise<CustomerCategory> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE customer_category SET name = ?, updated_at = ? WHERE id = ?',
      [data.name, now, id]
    )
    
    saveDb(this.db)
    
    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Customer category not found after update')
    }
    return updated
  }

  /**
   * Soft delete customer category
   */
  async softDelete(id: string): Promise<CustomerCategory> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE customer_category SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    )
    
    saveDb(this.db)
    
    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Customer category not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted customer category
   */
  async restore(id: string): Promise<CustomerCategory> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE customer_category SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    )
    
    saveDb(this.db)
    
    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Customer category not found after restore')
    }
    return restored
  }

  /**
   * Map database row to CustomerCategory object
   */
  private mapRowToCustomerCategory(row: any): CustomerCategory {
    return {
      id: row.id as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
