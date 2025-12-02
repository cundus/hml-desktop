import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Batch {
  id: string
  productId: string
  code: string
  expiryDate: Date | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreateBatchDto {
  productId: string
  code: string
  expiryDate?: Date
}

export interface UpdateBatchDto {
  code: string
  expiryDate?: Date
}

export class BatchService {
  constructor(private db: Database) {}

  /**
   * Get all batches
   */
  async findAll(): Promise<Batch[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM batch WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: Batch[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToBatch(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get batch by ID
   */
  async findById(id: string): Promise<Batch | undefined> {
    const stmt = this.db.prepare('SELECT * FROM batch WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToBatch(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get batch by code
   */
  async findByCode(code: string): Promise<Batch | undefined> {
    const stmt = this.db.prepare('SELECT * FROM batch WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToBatch(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get batches by product ID
   */
  async findByProductId(productId: string): Promise<Batch[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM batch WHERE product_id = ? AND deleted_at IS NULL ORDER BY expiry_date ASC'
    )
    stmt.bind([productId])

    const results: Batch[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToBatch(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get expiring batches (within specified days)
   */
  async findExpiring(days: number): Promise<Batch[]> {
    const futureDate = Date.now() + days * 24 * 60 * 60 * 1000
    const stmt = this.db.prepare(
      'SELECT * FROM batch WHERE expiry_date IS NOT NULL AND expiry_date <= ? AND deleted_at IS NULL ORDER BY expiry_date ASC'
    )
    stmt.bind([futureDate])

    const results: Batch[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToBatch(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new batch
   */
  async create(data: CreateBatchDto): Promise<Batch> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO batch (id, product_id, code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.productId, data.code, data.expiryDate ? data.expiryDate.getTime() : null, now, now]
    )

    saveDb(this.db)

    return {
      id,
      productId: data.productId,
      code: data.code,
      expiryDate: data.expiryDate ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null
    }
  }

  /**
   * Update batch
   */
  async update(id: string, data: UpdateBatchDto): Promise<Batch> {
    const now = Date.now()

    this.db.run('UPDATE batch SET code = ?, expiry_date = ?, updated_at = ? WHERE id = ?', [
      data.code,
      data.expiryDate ? data.expiryDate.getTime() : null,
      now,
      id
    ])

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Batch not found after update')
    }
    return updated
  }

  /**
   * Soft delete batch
   */
  async softDelete(id: string): Promise<Batch> {
    const now = Date.now()

    this.db.run('UPDATE batch SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Batch not found after delete')
    }
    return deleted
  }

  /**
   * Map database row to Batch object
   */
  private mapRowToBatch(row: any): Batch {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      code: row.code as string,
      expiryDate: row.expiry_date ? new Date(row.expiry_date as number) : null,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
