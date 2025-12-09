import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

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
  id?: string // Allow custom ID like 'RETAIL', 'WHOLESALE'
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

export class PriceCategoryService {
  constructor(private db: Database) {
    this.ensureTable()
  }

  private ensureTable(): void {
    // Add isDefault and sortOrder columns if they don't exist
    try {
      this.db.run('ALTER TABLE price_category ADD COLUMN is_default INTEGER DEFAULT 0')
    } catch {
      // Column already exists
    }
    try {
      this.db.run('ALTER TABLE price_category ADD COLUMN sort_order INTEGER DEFAULT 0')
    } catch {
      // Column already exists
    }
    saveDb(this.db)
  }

  async getAll(): Promise<PriceCategory[]> {
    const stmt = this.db.prepare(
      `SELECT id, name, description, is_default, sort_order, created_at, updated_at
       FROM price_category
       WHERE deleted_at IS NULL
       ORDER BY sort_order ASC, name ASC`
    )

    const results: PriceCategory[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push({
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string) || null,
        isDefault: (row.is_default as number) === 1,
        sortOrder: (row.sort_order as number) || 0,
        createdAt: new Date((row.created_at as number) || 0),
        updatedAt: new Date((row.updated_at as number) || 0)
      })
    }
    stmt.free()
    console.log(results)

    return results
  }

  async getById(id: string): Promise<PriceCategory | null> {
    const stmt = this.db.prepare(
      `SELECT id, name, description, is_default, sort_order, created_at, updated_at
       FROM price_category
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`
    )
    stmt.bind([id])

    let result: PriceCategory | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject()
      result = {
        id: row.id as string,
        name: row.name as string,
        description: (row.description as string) || null,
        isDefault: (row.is_default as number) === 1,
        sortOrder: (row.sort_order as number) || 0,
        createdAt: new Date((row.created_at as number) || 0),
        updatedAt: new Date((row.updated_at as number) || 0)
      }
    }
    stmt.free()

    return result
  }

  async create(data: CreatePriceCategoryDto): Promise<PriceCategory> {
    const id = data.id || randomUUID()
    const now = Date.now()

    this.db.run(
      `INSERT INTO price_category (id, name, description, is_default, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.description || null,
        data.isDefault ? 1 : 0,
        data.sortOrder ?? 0,
        now,
        now
      ]
    )

    saveDb(this.db)

    const created = await this.getById(id)
    if (!created) {
      throw new Error('Price category not found after creation')
    }
    return created
  }

  async update(id: string, data: UpdatePriceCategoryDto): Promise<PriceCategory> {
    const existing = await this.getById(id)
    if (!existing) {
      throw new Error('Price category not found')
    }

    const now = Date.now()
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description || null)
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?')
      values.push(data.isDefault ? 1 : 0)
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?')
      values.push(data.sortOrder)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      values.push(now)
      values.push(id)

      this.db.run(`UPDATE price_category SET ${updates.join(', ')} WHERE id = ?`, values)
      saveDb(this.db)
    }

    const updated = await this.getById(id)
    if (!updated) {
      throw new Error('Price category not found after update')
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) {
      throw new Error('Price category not found')
    }

    // Prevent deletion of default categories
    if (existing.isDefault) {
      throw new Error('Cannot delete default price category')
    }

    const now = Date.now()
    this.db.run('UPDATE price_category SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)
  }
}
