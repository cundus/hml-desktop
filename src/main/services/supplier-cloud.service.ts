import { randomUUID } from 'crypto'
import { CreateSupplierDto, UpdateSupplierDto } from '../types/dto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'

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
  private queueService: QueueService
  private readonly tableName = 'supplier'

  constructor(queueService: QueueService) {
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<Supplier[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM supplier WHERE deleted_at IS NULL ORDER BY name ASC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[SupplierCloud] findAll error:', error)
        throw error
      }
    }
    throw new Error('Offline mode not supported for suppliers')
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
        throw error
      }
    }
    throw new Error('Offline mode not supported for suppliers')
  }

  async create(data: CreateSupplierDto): Promise<Supplier> {
    const id = randomUUID()
    const now = new Date()

    const supplier: Supplier = {
      id,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null
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

    // Blind queue for offline/error
    await this.queueService.add('INSERT', this.tableName, {
      id,
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
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

    // Blind queue for offline/error
    await this.queueService.add('UPDATE', this.tableName, {
      id,
      name: updated.name,
      phone: updated.phone,
      address: updated.address,
      updated_at: now.toISOString()
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
        await pool.query('UPDATE supplier SET deleted_at = $1, updated_at = $2 WHERE id = $3', [
          now,
          now,
          id
        ])
        return deleted
      } catch (error) {
        console.error('[SupplierCloud] delete error, queuing:', error)
      }
    }

    // Blind queue for offline/error
    await this.queueService.add('DELETE', this.tableName, { id })
    return deleted
  }

  async restore(id: string): Promise<Supplier> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query('UPDATE supplier SET deleted_at = NULL, updated_at = $1 WHERE id = $2', [
          now,
          id
        ])
         // Retreive to confirm
        const restored = await this.findById(id)
        if (restored) return restored
      } catch (error) {
        console.error('[SupplierCloud] restore error:', error)
      }
    }
    
    // Note: Restore is hard to queue generically without 'UPDATE' payload logic, 
    // but assuming standard UPDATE works if we knew the fields. 
    // Here we just queue a restore action if supported, or manual UPDATE.
    // QueueService usually takes INSERT/UPDATE/DELETE. 
    // We'll queue as UPDATE for deleted_at = null via custom means or just admit it's strictly online.
    // "Phase 2: make restore cloud-only". 
    // Let's make restore strict cloud-only here too to match TransactionService.
    throw new Error('Offline restore not supported')
  }

  private mapCloudRow(row: Record<string, unknown>): Supplier {
    return {
      id: row.id as string,
      name: row.name as string,
      phone: row.phone as string | null,
      address: row.address as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null
    }
  }
}
