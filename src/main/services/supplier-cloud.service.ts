import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { CreateSupplierDto, UpdateSupplierDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export class SupplierCloudService {
  private localDb: Database
  private queueService: QueueService
  private readonly tableName = 'supplier'

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Supplier[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM supplier WHERE deleted_at IS NULL ORDER BY name ASC')
        return result.rows.map(row => this.mapCloudRow(row))
      } catch (error) {
        console.error('[SupplierCloud] findAll error:', error)
        return this.findAllLocal()
      }
    }
    return this.findAllLocal()
  }

  private findAllLocal(): Supplier[] {
    const stmt = this.localDb.prepare('SELECT * FROM supplier WHERE deleted_at IS NULL ORDER BY name ASC')
    const results: Supplier[] = []
    while (stmt.step()) {
      results.push(this.mapLocalRow(stmt.getAsObject()))
    }
    stmt.free()
    return results
  }

  async findById(id: string): Promise<Supplier | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM supplier WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
        return undefined
      } catch (error) {
        console.error('[SupplierCloud] findById error:', error)
        return this.findByIdLocal(id)
      }
    }
    return this.findByIdLocal(id)
  }

  private findByIdLocal(id: string): Supplier | undefined {
    const stmt = this.localDb.prepare('SELECT * FROM supplier WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const s = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return s
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateSupplierDto): Promise<Supplier> {
    const id = randomUUID()
    const now = new Date()

    const supplier: Supplier = {
      id, name: data.name, phone: data.phone ?? null, address: data.address ?? null,
      createdAt: now, updatedAt: now, syncedAt: null, deletedAt: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO supplier (id, name, phone, address, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, data.name, data.phone ?? null, data.address ?? null, now, now]
        )
        console.log('[SupplierCloud] Created in cloud:', id)
        return supplier
      } catch (error) {
        console.error('[SupplierCloud] create error, queuing:', error)
      }
    }

    this.saveToLocal(supplier)
    await this.queueService.add('INSERT', this.tableName, {
      id, name: data.name, phone: data.phone ?? null, address: data.address ?? null,
      created_at: now.toISOString(), updated_at: now.toISOString()
    })
    return supplier
  }

  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Supplier not found')

    const now = new Date()
    const updated: Supplier = {
      ...existing,
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      address: data.address ?? existing.address,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE supplier SET name = $1, phone = $2, address = $3, updated_at = $4 WHERE id = $5',
          [updated.name, updated.phone, updated.address, now, id]
        )
        console.log('[SupplierCloud] Updated in cloud:', id)
        return updated
      } catch (error) {
        console.error('[SupplierCloud] update error, queuing:', error)
      }
    }

    this.updateLocal(updated)
    await this.queueService.add('UPDATE', this.tableName, {
      id, name: updated.name, phone: updated.phone, address: updated.address, updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<Supplier> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Supplier not found')

    const now = new Date()
    const deleted: Supplier = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE supplier SET deleted_at = $1, updated_at = $2 WHERE id = $3', [now, now, id])
        return deleted
      } catch (error) {
        console.error('[SupplierCloud] delete error, queuing:', error)
      }
    }

    this.deleteLocal(id, now)
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Supplier> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE supplier SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [now, id])
      } catch (error) {
        console.error('[SupplierCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE supplier SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now.getTime(), id])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Supplier not found after restore')
    return restored
  }

  private saveToLocal(s: Supplier): void {
    this.localDb.run(
      'INSERT OR REPLACE INTO supplier (id, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [s.id, s.name, s.phone, s.address, s.createdAt.getTime(), s.updatedAt.getTime()]
    )
    saveDb(this.localDb)
  }

  private updateLocal(s: Supplier): void {
    this.localDb.run('UPDATE supplier SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?',
      [s.name, s.phone, s.address, s.updatedAt.getTime(), s.id])
    saveDb(this.localDb)
  }

  private deleteLocal(id: string, now: Date): void {
    this.localDb.run('UPDATE supplier SET deleted_at = ?, updated_at = ? WHERE id = ?', [now.getTime(), now.getTime(), id])
    saveDb(this.localDb)
  }

  private mapCloudRow(row: Record<string, unknown>): Supplier {
    return {
      id: row.id as string, name: row.name as string,
      phone: row.phone as string | null, address: row.address as string | null,
      createdAt: new Date(row.created_at as string), updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): Supplier {
    return {
      id: row.id as string, name: row.name as string,
      phone: row.phone as string | null, address: row.address as string | null,
      createdAt: new Date(row.created_at as number), updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null
    }
  }
}
