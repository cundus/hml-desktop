import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  categoryId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreateCustomerDto {
  name: string
  phone?: string
  address?: string
  categoryId?: string
}

export interface UpdateCustomerDto {
  name: string
  phone?: string
  address?: string
  categoryId?: string
}

export class CustomerService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) customers
   */
  async findAll(): Promise<Customer[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM customer WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Customer[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToCustomer(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get customer by ID
   */
  async findById(id: string): Promise<Customer | undefined> {
    const stmt = this.db.prepare('SELECT * FROM customer WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToCustomer(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Search customers by name or phone
   */
  async search(query: string): Promise<Customer[]> {
    const searchPattern = `%${query}%`
    const stmt = this.db.prepare(
      'SELECT * FROM customer WHERE deleted_at IS NULL AND (name LIKE ? OR phone LIKE ?) LIMIT 50'
    )
    stmt.bind([searchPattern, searchPattern])

    const results: Customer[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToCustomer(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get customers by category
   */
  async findByCategory(categoryId: string): Promise<Customer[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM customer WHERE category_id = ? AND deleted_at IS NULL ORDER BY name ASC'
    )
    stmt.bind([categoryId])

    const results: Customer[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToCustomer(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerDto): Promise<Customer> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO customer (id, name, phone, address, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.phone ?? null, data.address ?? null, data.categoryId ?? null, now, now]
    )

    saveDb(this.db)

    return {
      id,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      categoryId: data.categoryId ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update customer
   */
  async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const now = Date.now()

    this.db.run(
      'UPDATE customer SET name = ?, phone = ?, address = ?, category_id = ?, updated_at = ? WHERE id = ?',
      [data.name, data.phone ?? null, data.address ?? null, data.categoryId ?? null, now, id]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Customer not found after update')
    }
    return updated
  }

  /**
   * Soft delete customer
   */
  async softDelete(id: string): Promise<Customer> {
    const now = Date.now()

    this.db.run('UPDATE customer SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Customer not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted customer
   */
  async restore(id: string): Promise<Customer> {
    const now = Date.now()

    this.db.run('UPDATE customer SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Customer not found after restore')
    }
    return restored
  }

  /**
   * Map database row to Customer object
   */
  private mapRowToCustomer(row: any): Customer {
    return {
      id: row.id as string,
      name: row.name as string,
      phone: row.phone as string | null,
      address: row.address as string | null,
      categoryId: row.category_id as string | null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
