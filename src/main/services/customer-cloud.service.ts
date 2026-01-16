import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

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

/**
 * CustomerCloudService - Cloud-first customer service
 */
export class CustomerCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'customer'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Customer[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM customer WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[CustomerCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Customer[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM customer WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Customer[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Customer | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM customer WHERE id = $1', [id])
        if (result.rows.length > 0) {
          return this.mapCloudRow(result.rows[0])
        }
        return undefined
      } catch (error) {
        console.error('[CustomerCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Customer | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM customer WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const c = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return c
    }
    stmt.free()
    return undefined
  }

  async search(query: string): Promise<Customer[]> {
    const pattern = `%${query}%`
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM customer WHERE deleted_at IS NULL AND (name ILIKE $1 OR phone ILIKE $1) LIMIT 50',
          [pattern]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[CustomerCloud] search error:', error)
      }
    }
    // Local search
    const stmt = this.localDb.prepare(
      'SELECT * FROM customer WHERE deleted_at IS NULL AND (name LIKE ? OR phone LIKE ?) LIMIT 50'
    )
    stmt.bind([pattern, pattern])
    const results: Customer[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findByCategory(categoryId: string): Promise<Customer[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM customer WHERE category_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
          [categoryId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[CustomerCloud] findByCategory error:', error)
      }
    }
    // Local fallback
    const stmt = this.localDb.prepare(
      'SELECT * FROM customer WHERE category_id = ? AND deleted_at IS NULL ORDER BY name ASC'
    )
    stmt.bind([categoryId])
    const results: Customer[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async create(data: CreateCustomerDto): Promise<Customer> {
    const id = randomUUID()
    const now = new Date()

    const customer: Customer = {
      id,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      categoryId: data.categoryId ?? null,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO customer (id, name, phone, address, category_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            id,
            data.name,
            data.phone ?? null,
            data.address ?? null,
            data.categoryId ?? null,
            now,
            now
          ]
        )
        console.log('[CustomerCloud] Created in cloud:', id)
        return customer
      } catch (error) {
        console.error('[CustomerCloud] create error, queuing:', error)
      }
    }

    // Offline: save local + queue
    this.saveToLocal(customer)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      category_id: data.categoryId ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    console.log('[CustomerCloud] Queued:', id)
    return customer
  }

  async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Customer not found')

    const now = new Date()
    const updated: Customer = {
      ...existing,
      name: data.name,
      phone: data.phone ?? existing.phone,
      address: data.address ?? existing.address,
      categoryId: data.categoryId ?? existing.categoryId,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE customer SET name = $1, phone = $2, address = $3, category_id = $4, updated_at = $5 WHERE id = $6',
          [updated.name, updated.phone, updated.address, updated.categoryId, now, id]
        )
        console.log('[CustomerCloud] Updated in cloud:', id)
        return updated
      } catch (error) {
        console.error('[CustomerCloud] update error, queuing:', error)
      }
    }

    this.updateLocal(updated)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      name: updated.name,
      phone: updated.phone,
      address: updated.address,
      category_id: updated.categoryId,
      updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<Customer> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Customer not found')

    const now = new Date()
    const deleted: Customer = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE customer SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
          now,
          now,
          id
        ])
        console.log('[CustomerCloud] Deleted in cloud:', id)
        return deleted
      } catch (error) {
        console.error('[CustomerCloud] delete error, queuing:', error)
      }
    }

    this.deleteLocal(id, now)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Customer> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE customer SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [
          now,
          id
        ])
      } catch (error) {
        console.error('[CustomerCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE customer SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Customer not found after restore')
    return restored
  }

  // Local helpers
  private saveToLocal(c: Customer): void {
    this.localDb.run(
      'INSERT OR REPLACE INTO customer (id, name, phone, address, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.phone, c.address, c.categoryId, c.createdAt.getTime(), c.updatedAt.getTime()]
    )
    saveDb(this.localDb)
  }

  private updateLocal(c: Customer): void {
    this.localDb.run(
      'UPDATE customer SET name = ?, phone = ?, address = ?, category_id = ?, updated_at = ? WHERE id = ?',
      [c.name, c.phone, c.address, c.categoryId, c.updatedAt.getTime(), c.id]
    )
    saveDb(this.localDb)
  }

  private deleteLocal(id: string, now: Date): void {
    this.localDb.run('UPDATE customer SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
  }

  // Mappers
  private mapCloudRow(row: Record<string, unknown>): Customer {
    return {
      id: row.id as string,
      name: row.name as string,
      phone: row.phone as string | null,
      address: row.address as string | null,
      categoryId: row.category_id as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Customer {
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
