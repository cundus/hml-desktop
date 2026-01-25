import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateCategoryDto, UpdateCategoryDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Category {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

/**
 * CategoryCloudService - Cloud-first category service
 *
 * Pattern:
 * - Online: Direct PostgreSQL operations
 * - Offline: Queue operations for later replay
 */
export class CategoryCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'category'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  /**
   * Check if currently online
   */
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  /**
   * Get all active categories
   */
  async findAll(): Promise<Category[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM category WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRowToCategory(row))
      } catch (error) {
        console.error('[CategoryCloud] findAll cloud error:', error)
        // Fallback to local on error
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  /**
   * Get all from local DB (fallback)
   */
  private findAllLocal(): Category[] {
    const stmt = this.localDb.prepare(
      'SELECT * FROM category WHERE deleted_at IS NULL ORDER BY name ASC'
    )
    const results: Category[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRowToCategory(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  /**
   * Get category by ID
   */
  async findById(id: string): Promise<Category | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM category WHERE id = $1', [id])
        if (result.rows.length > 0) {
          return this.mapCloudRowToCategory(result.rows[0])
        }
        return undefined
      } catch (error) {
        console.error('[CategoryCloud] findById cloud error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  /**
   * Get by ID from local DB (fallback)
   */
  private findByIdLocal(id: string): Category | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM category WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const cat = this.mapLocalRowToCategory(stmt.getAsObject())
      stmt.free()
      return cat
    }
    stmt.free()
    return undefined
  }

  /**
   * Find category by name (case-insensitive)
   * Used by product import to look up or auto-create categories
   */
  async findByName(name: string): Promise<Category | undefined> {
    const trimmedName = name.trim().toLowerCase()
    if (!trimmedName) return undefined

    // Get all categories and find by name (case-insensitive)
    const categories = await this.findAll()
    return categories.find((c) => c.name.toLowerCase() === trimmedName)
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDto): Promise<Category> {
    const id = randomUUID()
    const now = new Date()

    const category: Category = {
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
          'INSERT INTO category (id, name, created_at, updated_at) VALUES ($1, $2, $3, $4)',
          [id, data.name, now, now]
        )
        console.log('[CategoryCloud] Created in cloud:', id)
        return category
      } catch (error) {
        console.error('[CategoryCloud] create cloud error, queuing:', error)
        // Fall through to queue
      }
    }

    // Offline or error: save to local + queue
    this.saveToLocal(category)
    await this.queueService.add('INSERT', this.tableName, {
      id,
      name: data.name,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    console.log('[CategoryCloud] Queued for later:', id)

    return category
  }

  /**
   * Update category
   */
  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Category not found')
    }

    const now = new Date()
    const updated: Category = {
      ...existing,
      name: data.name ?? existing.name,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE category SET name = $1, updated_at = $2 WHERE id = $3', [
          updated.name,
          now,
          id
        ])
        console.log('[CategoryCloud] Updated in cloud:', id)
        return updated
      } catch (error) {
        console.error('[CategoryCloud] update cloud error, queuing:', error)
      }
    }

    // Offline or error: update local + queue
    this.updateLocal(updated)
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      name: updated.name,
      updated_at: now.toISOString()
    })
    console.log('[CategoryCloud] Update queued:', id)

    return updated
  }

  /**
   * Soft delete category
   */
  async delete(id: string): Promise<Category> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Category not found')

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('DELETE FROM category WHERE id = $1', [id])

        this.deleteLocal(id)

        return existing
      } catch (error) {
        console.error('[CategoryCloud] delete cloud error, queuing:', error)
      }
    }

    // Offline or error: delete local + queue
    this.deleteLocal(id)
    await this.queueService.add('DELETE', this.tableName, { id })

    return existing
  }

  private deleteLocal(id: string): void {
    this.localDb.run('DELETE FROM category WHERE id = ?', [id])
    saveDb(this.localDb)
  }

  /**
   * Restore soft-deleted category
   */
  async restore(_id: string): Promise<Category> {
    throw new Error('Restore not supported for hard deleted categories')
  }

  // ==================== LOCAL DB HELPERS ====================

  private saveToLocal(cat: Category): void {
    this.localDb.run(
      'INSERT OR REPLACE INTO category (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [cat.id, cat.name, cat.createdAt.getTime(), cat.updatedAt.getTime()]
    )
    saveDb(this.localDb)
  }

  private updateLocal(cat: Category): void {
    this.localDb.run('UPDATE category SET name = ?, updated_at = ? WHERE id = ?', [
      cat.name,
      cat.updatedAt.getTime(),
      cat.id
    ])
    saveDb(this.localDb)
  }

  // ==================== ROW MAPPERS ====================

  private mapCloudRowToCategory(row: Record<string, unknown>): Category {
    return {
      id: row.id as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRowToCategory(row: Record<string, unknown>): Category {
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
