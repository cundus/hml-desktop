import { Database } from 'sql.js'
import { CreateCategoryDto, UpdateCategoryDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Category {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class CategoryService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) categories
   */
  async findAll(): Promise<Category[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM category WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Category[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToCategory(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get category by ID
   */
  async findById(id: string): Promise<Category | undefined> {
    const stmt = this.db.prepare('SELECT * FROM category WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToCategory(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDto): Promise<Category> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run('INSERT INTO category (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      id,
      data.name,
      now,
      now
    ])

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
   * Update category
   */
  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Category not found')
    }

    const now = Date.now()

    this.db.run('UPDATE category SET name = ?, updated_at = ? WHERE id = ?', [
      data.name ?? existing.name,
      now,
      id
    ])

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Category not found after update')
    }
    return updated
  }

  /**
   * Soft delete category
   */
  async softDelete(id: string): Promise<Category> {
    const now = Date.now()

    this.db.run('UPDATE category SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Category not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted category
   */
  async restore(id: string): Promise<Category> {
    const now = Date.now()

    this.db.run('UPDATE category SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Category not found after restore')
    }
    return restored
  }

  /**
   * Map database row to Category object
   */
  private mapRowToCategory(row: any): Category {
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
