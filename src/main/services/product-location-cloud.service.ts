import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface ProductLocation {
  id: string
  productId: string
  storeId: string
  quantity: number
  reservedQuantity: number
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}
export interface CreateProductLocationDto {
  productId: string
  storeId: string
  quantity?: number
  reservedQuantity?: number
}
export interface UpdateProductLocationDto {
  quantity: number
  reservedQuantity?: number
}

export class ProductLocationCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }
  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<ProductLocation[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_location WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductLocationCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_location WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: ProductLocation[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<ProductLocation | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM product_location WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductLocationCloud] findById error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM product_location WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const p = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return p
    }
    stmt.free()
    return undefined
  }

  async findByProductId(productId: string): Promise<ProductLocation[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_location WHERE product_id = $1 AND deleted_at IS NULL',
          [productId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductLocationCloud] findByProductId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_location WHERE product_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId])
    const results: ProductLocation[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByStoreId(storeId: string): Promise<ProductLocation[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_location WHERE store_id = $1 AND deleted_at IS NULL',
          [storeId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductLocationCloud] findByStoreId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_location WHERE store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([storeId])
    const results: ProductLocation[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<ProductLocation | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_location WHERE product_id = $1 AND store_id = $2 AND deleted_at IS NULL',
          [productId, storeId]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductLocationCloud] findByProductAndStore error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_location WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId, storeId])
    if (stmt.step()) {
      const p = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return p
    }
    stmt.free()
    return undefined
  }

  async create(data: CreateProductLocationDto): Promise<ProductLocation> {
    const id = randomUUID()
    const now = new Date()
    const pl: ProductLocation = {
      id,
      productId: data.productId,
      storeId: data.storeId,
      quantity: data.quantity ?? 0,
      reservedQuantity: data.reservedQuantity ?? 0,
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'INSERT INTO product_location (id, product_id, store_id, quantity, reserved_quantity, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, data.productId, data.storeId, pl.quantity, pl.reservedQuantity, now, now]
        )
        return pl
      } catch (error) {
        console.error('[ProductLocationCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO product_location (id, product_id, store_id, quantity, reserved_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.storeId,
        pl.quantity,
        pl.reservedQuantity,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'product_location', {
      id,
      product_id: data.productId,
      store_id: data.storeId,
      quantity: pl.quantity,
      reserved_quantity: pl.reservedQuantity,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return pl
  }

  async update(id: string, data: UpdateProductLocationDto): Promise<ProductLocation> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product location not found')
    const now = new Date()
    const updated: ProductLocation = {
      ...existing,
      quantity: data.quantity,
      reservedQuantity: data.reservedQuantity ?? existing.reservedQuantity,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product_location SET quantity = $1, reserved_quantity = $2, updated_at = $3 WHERE id = $4',
          [updated.quantity, updated.reservedQuantity, now, id]
        )
        return updated
      } catch (error) {
        console.error('[ProductLocationCloud] update error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE product_location SET quantity = ?, reserved_quantity = ?, updated_at = ? WHERE id = ?',
      [updated.quantity, updated.reservedQuantity, now.getTime(), id]
    )
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'product_location', {
      id,
      quantity: updated.quantity,
      reserved_quantity: updated.reservedQuantity,
      updated_at: now.toISOString()
    })
    return updated
  }

  async adjustQuantity(
    productId: string,
    storeId: string,
    delta: number
  ): Promise<ProductLocation> {
    let location = await this.findByProductAndStore(productId, storeId)
    if (!location) {
      location = await this.create({ productId, storeId, quantity: delta, reservedQuantity: 0 })
    } else {
      location = await this.update(location.id, {
        quantity: location.quantity + delta,
        reservedQuantity: location.reservedQuantity
      })
    }
    return location
  }

  async reserveQuantity(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<ProductLocation> {
    const location = await this.findByProductAndStore(productId, storeId)
    if (!location) throw new Error('Product location not found')
    const available = location.quantity - location.reservedQuantity
    if (available < quantity) throw new Error('Insufficient quantity available')
    return await this.update(location.id, {
      quantity: location.quantity,
      reservedQuantity: location.reservedQuantity + quantity
    })
  }

  async releaseReservedQuantity(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<ProductLocation> {
    const location = await this.findByProductAndStore(productId, storeId)
    if (!location) throw new Error('Product location not found')
    return await this.update(location.id, {
      quantity: location.quantity,
      reservedQuantity: Math.max(0, location.reservedQuantity - quantity)
    })
  }

  async softDelete(id: string): Promise<ProductLocation> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product location not found')
    const now = new Date()
    const deleted: ProductLocation = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product_location SET deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
        return deleted
      } catch (error) {
        console.error('[ProductLocationCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE product_location SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', 'product_location', { id })
    return deleted
  }

  private mapCloudRow(row: Record<string, unknown>): ProductLocation {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      quantity: parseFloat(row.quantity as string) || 0,
      reservedQuantity: parseFloat(row.reserved_quantity as string) || 0,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): ProductLocation {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      quantity: row.quantity as number,
      reservedQuantity: row.reserved_quantity as number,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
