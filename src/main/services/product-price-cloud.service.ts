import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService } from './queue.service'
import { saveDb } from '../localDb'

export interface ProductPrice {
  id: string
  productId: string
  storeId: string
  price: string
  cost: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}
export interface CreateProductPriceDto {
  productId: string
  storeId: string
  price: string
  cost: string
  isActive?: boolean
}
export interface UpdateProductPriceDto {
  price: string
  cost: string
  isActive?: boolean
}

export class ProductPriceCloudService {
  private localDb: Database
  private queueService: QueueService

  constructor(localDb: Database, queueService: QueueService) {
    this.localDb = localDb
    this.queueService = queueService
  }

  private isOnline(): boolean {
    return getConnectivity().isOnline()
  }

  async findAll(): Promise<ProductPrice[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_price WHERE deleted_at IS NULL ORDER BY created_at DESC'
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductPriceCloud] findAll error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_price WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: ProductPrice[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findById(id: string): Promise<ProductPrice | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query('SELECT * FROM product_price WHERE id = $1', [id])
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductPriceCloud] findById error:', error)
      }
    }
    const stmt = this.localDb.prepare('SELECT * FROM product_price WHERE id = ?')
    stmt.bind([id])
    if (stmt.step()) {
      const p = this.mapLocalRow(stmt.getAsObject())
      stmt.free()
      return p
    }
    stmt.free()
    return undefined
  }

  async findByProductId(productId: string): Promise<ProductPrice[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_price WHERE product_id = $1 AND deleted_at IS NULL',
          [productId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductPriceCloud] findByProductId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_price WHERE product_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId])
    const results: ProductPrice[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByStoreId(storeId: string): Promise<ProductPrice[]> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_price WHERE store_id = $1 AND deleted_at IS NULL',
          [storeId]
        )
        return result.rows.map((row) => this.mapCloudRow(row))
      } catch (error) {
        console.error('[ProductPriceCloud] findByStoreId error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_price WHERE store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([storeId])
    const results: ProductPrice[] = []
    while (stmt.step()) results.push(this.mapLocalRow(stmt.getAsObject()))
    stmt.free()
    return results
  }

  async findByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<ProductPrice | undefined> {
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        const result = await pool.query(
          'SELECT * FROM product_price WHERE product_id = $1 AND store_id = $2 AND deleted_at IS NULL',
          [productId, storeId]
        )
        if (result.rows.length > 0) return this.mapCloudRow(result.rows[0])
      } catch (error) {
        console.error('[ProductPriceCloud] findByProductAndStore error:', error)
      }
    }
    const stmt = this.localDb.prepare(
      'SELECT * FROM product_price WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL'
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

  async create(data: CreateProductPriceDto): Promise<ProductPrice> {
    const id = randomUUID()
    const now = new Date()
    const pp: ProductPrice = {
      id,
      productId: data.productId,
      storeId: data.storeId,
      price: data.price,
      cost: data.cost,
      isActive: data.isActive ?? true,
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
          'INSERT INTO product_price (id, product_id, store_id, price, cost, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [id, data.productId, data.storeId, data.price, data.cost, pp.isActive, now, now]
        )
        return pp
      } catch (error) {
        console.error('[ProductPriceCloud] create error, queuing:', error)
      }
    }

    this.localDb.run(
      'INSERT INTO product_price (id, product_id, store_id, price, cost, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.productId,
        data.storeId,
        data.price,
        data.cost,
        pp.isActive ? 1 : 0,
        now.getTime(),
        now.getTime()
      ]
    )
    saveDb(this.localDb)
    await this.queueService.add('INSERT', 'product_price', {
      id,
      product_id: data.productId,
      store_id: data.storeId,
      price: data.price,
      cost: data.cost,
      is_active: pp.isActive,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    return pp
  }

  async update(id: string, data: UpdateProductPriceDto): Promise<ProductPrice> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product price not found')
    const now = new Date()
    const updated: ProductPrice = {
      ...existing,
      price: data.price,
      cost: data.cost,
      isActive: data.isActive ?? existing.isActive,
      updatedAt: now
    }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product_price SET price = $1, cost = $2, is_active = $3, updated_at = $4 WHERE id = $5',
          [updated.price, updated.cost, updated.isActive, now, id]
        )
        return updated
      } catch (error) {
        console.error('[ProductPriceCloud] update error, queuing:', error)
      }
    }

    this.localDb.run(
      'UPDATE product_price SET price = ?, cost = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [updated.price, updated.cost, updated.isActive ? 1 : 0, now.getTime(), id]
    )
    saveDb(this.localDb)
    await this.queueService.add('UPDATE', 'product_price', {
      id,
      price: updated.price,
      cost: updated.cost,
      is_active: updated.isActive,
      updated_at: now.toISOString()
    })
    return updated
  }

  async softDelete(id: string): Promise<ProductPrice> {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Product price not found')
    const now = new Date()
    const deleted: ProductPrice = { ...existing, deletedAt: now, updatedAt: now }

    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product_price SET deleted_at = $1, updated_at = $2 WHERE id = $3',
          [now, now, id]
        )
        return deleted
      } catch (error) {
        console.error('[ProductPriceCloud] delete error, queuing:', error)
      }
    }

    this.localDb.run('UPDATE product_price SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now.getTime(),
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    await this.queueService.add('DELETE', 'product_price', { id })
    return deleted
  }

  async restore(id: string): Promise<ProductPrice> {
    const now = new Date()
    if (this.isOnline()) {
      try {
        const pool = getCloudDb().getPool()
        await pool.query(
          'UPDATE product_price SET deleted_at = NULL, updated_at = $1 WHERE id = $2',
          [now, id]
        )
      } catch (error) {
        console.error('[ProductPriceCloud] restore error:', error)
      }
    }
    this.localDb.run('UPDATE product_price SET deleted_at = NULL, updated_at = ? WHERE id = ?', [
      now.getTime(),
      id
    ])
    saveDb(this.localDb)
    const restored = await this.findById(id)
    if (!restored) throw new Error('Product price not found after restore')
    return restored
  }

  /**
   * Upsert cost for a specific product and store.
   * Creates a new record if it doesn't exist, updates if it does.
   */
  async upsertCost(
    productId: string,
    storeId: string,
    cost: string,
    price?: string
  ): Promise<ProductPrice> {
    const existing = await this.findByProductAndStore(productId, storeId)

    if (existing) {
      // Update existing record
      return this.update(existing.id, {
        price: price ?? existing.price,
        cost,
        isActive: existing.isActive
      })
    } else {
      // Create new record
      return this.create({
        productId,
        storeId,
        price: price ?? '0',
        cost,
        isActive: true
      })
    }
  }

  private mapCloudRow(row: Record<string, unknown>): ProductPrice {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      price: row.price as string,
      cost: row.cost as string,
      isActive: row.is_active === true,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
      deviceId: row.device_id as string | null
    }
  }

  private mapLocalRow(row: Record<string, unknown>): ProductPrice {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      storeId: row.store_id as string,
      price: row.price as string,
      cost: row.cost as string,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
