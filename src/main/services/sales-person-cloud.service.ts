import { CloudFirstBaseService } from './cloud-first-base.service'
import { QueueService } from './queue.service'
import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'
import {
  SalesPerson,
  CreateSalesPersonDto,
  UpdateSalesPersonDto
} from './sales-person.service'

/**
 * Cloud-first service for SalesPerson.
 * Implements dual-writing: Postgres if online, SQLite + Queue if offline.
 */
export class SalesPersonCloudService extends CloudFirstBaseService<
  SalesPerson,
  CreateSalesPersonDto,
  UpdateSalesPersonDto
> {
  protected tableName = 'sales_person'
  protected entityName = 'sales_person'

  constructor(localDb: Database, queueService: QueueService) {
    super(localDb, queueService)
  }

  async findAll(): Promise<SalesPerson[]> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `SELECT * FROM ${this.quoteTable(this.tableName)} WHERE deleted_at IS NULL ORDER BY name ASC`
        )
        this.syncToLocal(result.rows)
        return result.rows.map((row) => this.mapRow(row))
      } catch (error) {
        console.warn(`Cloud ${this.entityName} query failed, falling back to local`, error)
      }
    }
    return this.findAllLocal()
  }

  async findActive(): Promise<SalesPerson[]> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `SELECT * FROM ${this.quoteTable(this.tableName)} WHERE deleted_at IS NULL AND is_active = true ORDER BY name ASC`
        )
        this.syncToLocal(result.rows)
        return result.rows.map((row) => this.mapRow(row))
      } catch (error) {
        console.warn(`Cloud ${this.entityName} findActive failed, falling back to local`, error)
      }
    }
    return this.findActiveLocal()
  }

  async findById(id: string): Promise<SalesPerson | undefined> {
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `SELECT * FROM ${this.quoteTable(this.tableName)} WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        )
        if (result.rows.length > 0) return this.mapRow(result.rows[0])
      } catch (error) {
        console.warn(`Cloud ${this.entityName} findById failed`, error)
      }
    }
    return this.findByIdLocal(id)
  }

  async create(data: CreateSalesPersonDto): Promise<SalesPerson> {
    const id = randomUUID()
    const now = new Date()

    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `INSERT INTO ${this.quoteTable(this.tableName)} (id, name, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [id, data.name, data.isActive !== false, now, now]
        )
        const entity = this.mapRow(result.rows[0])
        this.saveToLocal(entity)
        return entity
      } catch (error) {
        console.warn(`Cloud create failed, queueing`, error)
      }
    }

    await this.queueOperation('INSERT', { id, name: data.name, is_active: data.isActive !== false, created_at: now, updated_at: now })
    return this.createLocal(id, data, now)
  }

  async update(id: string, data: UpdateSalesPersonDto): Promise<SalesPerson> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const existing = await this.findById(id)
        if (!existing) throw new Error('Sales person not found')

        const pool = this.getPool()
        const updates: string[] = []
        const values: unknown[] = []
        let i = 1

        if (data.name !== undefined) {
          updates.push(`name = $${i++}`)
          values.push(data.name)
        }

        if (data.isActive !== undefined) {
          updates.push(`is_active = $${i++}`)
          values.push(data.isActive)
        }

        if (updates.length > 0) {
          updates.push(`updated_at = $${i++}`)
          values.push(now)
          values.push(id)

          const result = await pool.query(
            `UPDATE ${this.quoteTable(this.tableName)} SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
            values
          )
          if (result.rows.length > 0) {
            const entity = this.mapRow(result.rows[0])
            this.saveToLocal(entity)
            return entity
          }
        } else {
          return existing
        }
      } catch (error) {
        console.warn(`Cloud update failed, queueing`, error)
      }
    }

    const payload: any = { id, updated_at: now }
    if (data.name !== undefined) payload.name = data.name
    if (data.isActive !== undefined) payload.is_active = data.isActive

    await this.queueOperation('UPDATE', payload)
    return this.updateLocal(id, data, now)
  }

  async softDelete(id: string): Promise<SalesPerson> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = this.getPool()
        const result = await pool.query(
          `UPDATE ${this.quoteTable(this.tableName)} SET deleted_at = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
          [now, now, id]
        )
        if (result.rows.length > 0) {
          const entity = this.mapRow(result.rows[0])
          this.saveToLocal(entity)
          return entity
        }
      } catch (error) {
        console.warn(`Cloud softDelete failed, queueing`, error)
      }
    }

    await this.queueOperation('DELETE', { id })
    return this.softDeleteLocal(id, now)
  }

  private mapRow(row: any): SalesPerson {
    return {
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: this.toDate(row.synced_at),
      deletedAt: this.toDate(row.deleted_at)
    }
  }

  private syncToLocal(rows: any[]): void {
    if (rows.length === 0) return
    try {
      this.localDb.run('BEGIN TRANSACTION')
      for (const row of rows) {
        this.saveToLocal(this.mapRow(row))
      }
      this.localDb.run('COMMIT')
      saveDb(this.localDb)
    } catch (e) {
      this.localDb.run('ROLLBACK')
      console.error('Failed to sync to local cache', e)
    }
  }

  private saveToLocal(entity: SalesPerson): void {
    const existing = this.findByIdLocalSync(entity.id)
    if (existing) {
      this.localDb.run(
        `UPDATE sales_person SET name = ?, is_active = ?, created_at = ?, updated_at = ?, deleted_at = ?, synced_at = ? WHERE id = ?`,
        [
          entity.name,
          entity.isActive ? 1 : 0,
          entity.createdAt.getTime(),
          entity.updatedAt.getTime(),
          entity.deletedAt ? entity.deletedAt.getTime() : null,
          entity.syncedAt ? entity.syncedAt.getTime() : null,
          entity.id
        ]
      )
    } else {
      this.localDb.run(
        `INSERT INTO sales_person (id, name, is_active, created_at, updated_at, deleted_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entity.id,
          entity.name,
          entity.isActive ? 1 : 0,
          entity.createdAt.getTime(),
          entity.updatedAt.getTime(),
          entity.deletedAt ? entity.deletedAt.getTime() : null,
          entity.syncedAt ? entity.syncedAt.getTime() : null
        ]
      )
    }
  }

  // --- LOCAL FALLBACK ---

  private findAllLocal(): SalesPerson[] {
    const stmt = this.localDb.prepare('SELECT * FROM sales_person WHERE deleted_at IS NULL ORDER BY name ASC')
    const results: SalesPerson[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  private findActiveLocal(): SalesPerson[] {
    const stmt = this.localDb.prepare('SELECT * FROM sales_person WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC')
    const results: SalesPerson[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  private findByIdLocalSync(id: string): SalesPerson | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM sales_person WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapLocalRow(row)
    }
    stmt.free()
    return undefined
  }

  private async findByIdLocal(id: string): Promise<SalesPerson | undefined> {
    return this.findByIdLocalSync(id)
  }

  private async createLocal(id: string, data: CreateSalesPersonDto, now: Date): Promise<SalesPerson> {
    this.localDb.run(
      'INSERT INTO sales_person (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, data.isActive !== false ? 1 : 0, now.getTime(), now.getTime()]
    )
    saveDb(this.localDb)
    return this.findByIdLocal(id) as Promise<SalesPerson>
  }

  private async updateLocal(id: string, data: UpdateSalesPersonDto, now: Date): Promise<SalesPerson> {
    const existing = await this.findByIdLocal(id)
    if (!existing) throw new Error('Not found locally')

    this.localDb.run(
      'UPDATE sales_person SET name = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [
        data.name ?? existing.name,
        data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.isActive ? 1 : 0,
        now.getTime(),
        id
      ]
    )
    saveDb(this.localDb)
    return this.findByIdLocal(id) as Promise<SalesPerson>
  }

  private async softDeleteLocal(id: string, now: Date): Promise<SalesPerson> {
    this.localDb.run('UPDATE sales_person SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    return this.findByIdLocal(id) as Promise<SalesPerson>
  }

  private mapLocalRow(row: any): SalesPerson {
    return {
      id: row.id as string,
      name: row.name as string,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
