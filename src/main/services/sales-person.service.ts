import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { saveDb } from '../localDb'

export interface SalesPerson {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreateSalesPersonDto {
  name: string
  isActive?: boolean
}

export interface UpdateSalesPersonDto {
  name?: string
  isActive?: boolean
}

export class SalesPersonService {
  constructor(private db: Database) {}

  async findAll(): Promise<SalesPerson[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM sales_person WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: SalesPerson[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToSalesPerson(row))
    }
    stmt.free()

    return results
  }

  async findById(id: string): Promise<SalesPerson | null> {
    const stmt = this.db.prepare('SELECT * FROM sales_person WHERE id = ? AND deleted_at IS NULL')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToSalesPerson(row)
    }

    stmt.free()
    return null
  }

  async findActive(): Promise<SalesPerson[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM sales_person WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC'
    )
    const results: SalesPerson[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToSalesPerson(row))
    }
    stmt.free()

    return results
  }

  async create(data: CreateSalesPersonDto): Promise<SalesPerson> {
    const id = randomUUID()
    const now = Date.now()
    const isActive = data.isActive !== false ? 1 : 0

    this.db.run(
      'INSERT INTO sales_person (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.name, isActive, now, now]
    )

    saveDb(this.db)
    return (await this.findById(id))!
  }

  async update(id: string, data: UpdateSalesPersonDto): Promise<SalesPerson | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const now = Date.now()
    const updates: string[] = []
    const values: (string | number)[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ?')
      values.push(data.isActive ? 1 : 0)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      values.push(now)
      values.push(id)

      this.db.run(`UPDATE sales_person SET ${updates.join(', ')} WHERE id = ?`, values)
      saveDb(this.db)
    }

    return this.findById(id)
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const now = Date.now()
    this.db.run('UPDATE sales_person SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])
    saveDb(this.db)

    return true
  }

  private mapRowToSalesPerson(row: Record<string, unknown>): SalesPerson {
    return {
      id: row.id as string,
      name: row.name as string,
      isActive: (row.is_active as number) === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
