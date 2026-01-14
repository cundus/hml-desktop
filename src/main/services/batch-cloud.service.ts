import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

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

export interface CreateBatchDto { productId: string; code: string; expiryDate?: Date }
export interface UpdateBatchDto { code: string; expiryDate?: Date }

export class BatchCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'batch'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean { return getConnectivity().isOnline() }

  async findAll(): Promise<Batch[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE deleted_at IS NULL ORDER BY created_at DESC')
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) {
        console.error('[BatchCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Batch[] {
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE deleted_at IS NULL ORDER BY created_at DESC')
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Batch | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[BatchCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Batch | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) { const b = this.mapLocalRow(stmt.getAsObject()); stmt.free(); return b }
    stmt.free()
    return undefined
  }

  async findByCode(code: string): Promise<Batch | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE code = $1 AND deleted_at IS NULL', [code])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) { console.error('[BatchCloud] findByCode error:', error) }
    }
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE code = ? AND deleted_at IS NULL')
    stmt.bind([code])
    if (stmt.step()) { const b = this.mapLocalRow(stmt.getAsObject()); stmt.free(); return b }
    stmt.free()
    return undefined
  }

  async findByProductId(productId: string): Promise<Batch[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE product_id = $1 AND deleted_at IS NULL ORDER BY expiry_date ASC', [productId])
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) { console.error('[BatchCloud] findByProductId error:', error) }
    }
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE product_id = ? AND deleted_at IS NULL ORDER BY expiry_date ASC')
    stmt.bind([productId])
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findExpiring(days: number): Promise<Batch[]> {
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM batch WHERE expiry_date IS NOT NULL AND expiry_date <= $1 AND deleted_at IS NULL ORDER BY expiry_date ASC', [futureDate])
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) { console.error('[BatchCloud] findExpiring error:', error) }
    }
    const stmt = this.localDb.prepare('SELECT * FROM batch WHERE expiry_date IS NOT NULL AND expiry_date <= ? AND deleted_at IS NULL ORDER BY expiry_date ASC')
    stmt.bind([futureDate.getTime()])
    const results: Batch[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async create(data: CreateBatchDto): Promise<Batch> {
    const id = randomUUID()
    const now = new Date()
    const batch: Batch = { id, productId: data.productId, code: data.code, expiryDate: data.expiryDate ?? null, createdAt: now, updatedAt: now, syncedAt: null, deletedAt: null }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('INSERT INTO batch (id, product_id, code, expiry_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, data.productId, data.code, data.expiryDate ?? null, now, now])
        return batch
      } catch (error) { console.error('[BatchCloud] create error, queuing:', error) }
    }

    this.localDb.run('INSERT INTO batch (id, product_id, code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.productId, data.code, data.expiryDate?.getTime() ?? null, now.getTime(), now.getTime()])
    saveDb(this.localDb)
    await this.queueService.add('INSERT', this.tableName, { id, product_id: data.productId, code: data.code, expiry_date: data.expiryDate?.toISOString() ?? null, created_at: now.toISOString(), updated_at: now.toISOString() })
    return batch
  }

  async update(id: string, data: UpdateBatchDto): Promise<Batch> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Batch not found')
    const now = new Date()
    const updated: Batch = { ...existing, code: data.code, expiryDate: data.expiryDate ?? existing.expiryDate, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE batch SET code = $1, expiry_date = $2, updated_at = $3 WHERE id = $4',
          [updated.code, updated.expiryDate, now, id])
        return updated
      } catch (error) { console.error('[BatchCloud] update error, queuing:', error) }
    }

    this.localDb.run('UPDATE batch SET code = ?, expiry_date = ?, updated_at = ? WHERE id = ?',
      [updated.code, updated.expiryDate?.getTime() ?? null, now.getTime(), id])
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', this.tableName, { id, code: updated.code, expiry_date: updated.expiryDate?.toISOString() ?? null, updated_at: now.toISOString() })
    return updated
  }

  async softDelete(id: string): Promise<Batch> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Batch not found')
    const now = new Date()
    const deleted: Batch = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE batch SET deleted_at = $1, updated_at = $2 WHERE id = $3', [now, now, id])
        return deleted
      } catch (error) { console.error('[BatchCloud] delete error, queuing:', error) }
    }

    this.localDb.run('UPDATE batch SET deleted_at = ?, updated_at = ? WHERE id = ?', [now.getTime(), now.getTime(), id])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  private mapCloudRow(row: Record<string, unknown>): Batch {
    return {
      id: row.id as string, productId: row.product_id as string, code: row.code as string,
      expiryDate: row.expiry_date ? new Date(row.expiry_date as string) : null,
      createdAt: new Date(row.created_at as string), updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Batch {
    return {
      id: row.id as string, productId: row.product_id as string, code: row.code as string,
      expiryDate: row.expiry_date ? new Date(row.expiry_date as number) : null,
      createdAt: new Date(row.created_at as number), updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
