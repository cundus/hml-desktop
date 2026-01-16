import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateCustomerCategoryDto, UpdateCustomerCategoryDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface CustomerCategory {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class CustomerCategoryCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'customer_category'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<CustomerCategory[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM customer_category WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[CustomerCategoryCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): CustomerCategory[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM customer_category WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: CustomerCategory[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<CustomerCategory | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM customer_category WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[CustomerCategoryCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): CustomerCategory | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM customer_category WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const c = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return c
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateCustomerCategoryDto): Promise<CustomerCategory> {
    const id = randomUUID()
    const now = new Date()

    const cat: CustomerCategory = {
      id,
      name: data.name,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO customer_category (id, name, created_at, updated_at) VALUES ($1, $2, $3, $4)',
          [id, data.name, now, now]
        )
        console.log('[CustomerCategoryCloud] Created in cloud:', id)
        return cat
      } catch (error) {
        console.error('[CustomerCategoryCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO customer_category (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, data.name, now.getTime(), now.getTime()]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      name: data.name,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return cat
  }

  async update(id: string, data: UpdateCustomerCategoryDto): Promise<CustomerCategory> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Customer category not found')

    const now = new Date()
    const updated: CustomerCategory = {
      ...existing,
      name: data.name ?? existing.name,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE customer_category SET name = $1, updated_at = $2 WHERE id = $3', [
          updated.name,
          now,
          id
        ])
        return updated
      } catch (error) {
        console.error('[CustomerCategoryCloud] update error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE customer_category SET name = ?, updated_at = ? WHERE id = ?', [
      updated.name,
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      name: updated.name,
      updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<CustomerCategory> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Customer category not found')
    const now = new Date()
    const deleted: CustomerCategory = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE customer_category SET deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
        return deleted
      } catch (error) {
        console.error('[CustomerCategoryCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE customer_category SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<CustomerCategory> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE customer_category SET deleted_at = NULL, updated_at = $1 WHERE id = $2',
          [now, id]
        )
      } catch (error) {
        console.error('[CustomerCategoryCloud] restore error:', error)
      }
    }
    this.localDb.run(
      'UPDATE customer_category SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now.getTime(), id]
    )
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Customer category not found after restore')
    return restored
  }

  private mapCloudRow(row: Record<string, unknown>): CustomerCategory {
    return {
      id: row.id as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): CustomerCategory {
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
