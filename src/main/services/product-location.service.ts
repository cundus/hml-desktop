import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

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

export class ProductLocationService {
  constructor(private db: Database) {}

  /**
   * Get all product locations
   */
  async findAll(): Promise<ProductLocation[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_location WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: ProductLocation[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductLocation(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get product location by ID
   */
  async findById(id: string): Promise<ProductLocation | undefined> {
    const stmt = this.db.prepare('SELECT * FROM product_location WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProductLocation(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get product locations by product ID
   */
  async findByProductId(productId: string): Promise<ProductLocation[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_location WHERE product_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId])

    const results: ProductLocation[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductLocation(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get product locations by store ID
   */
  async findByStoreId(storeId: string): Promise<ProductLocation[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_location WHERE store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([storeId])

    const results: ProductLocation[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductLocation(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get product location for specific product and store
   */
  async findByProductAndStore(
    productId: string,
    storeId: string
  ): Promise<ProductLocation | undefined> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_location WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId, storeId])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProductLocation(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new product location
   */
  async create(data: CreateProductLocationDto): Promise<ProductLocation> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO product_location (id, product_id, store_id, quantity, reserved_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.productId, data.storeId, data.quantity ?? 0, data.reservedQuantity ?? 0, now, now]
    )

    saveDb(this.db)

    return {
      id,
      productId: data.productId,
      storeId: data.storeId,
      quantity: data.quantity ?? 0,
      reservedQuantity: data.reservedQuantity ?? 0,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update product location
   */
  async update(id: string, data: UpdateProductLocationDto): Promise<ProductLocation> {
    const now = Date.now()

    this.db.run(
      'UPDATE product_location SET quantity = ?, reserved_quantity = ?, updated_at = ? WHERE id = ?',
      [data.quantity, data.reservedQuantity ?? 0, now, id]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Product location not found after update')
    }
    return updated
  }

  /**
   * Adjust quantity (add or subtract)
   */
  async adjustQuantity(
    productId: string,
    storeId: string,
    delta: number
  ): Promise<ProductLocation> {
    // Find existing location
    let location = await this.findByProductAndStore(productId, storeId)

    if (!location) {
      // Create new location if doesn't exist
      location = await this.create({
        productId,
        storeId,
        quantity: delta,
        reservedQuantity: 0
      })
    } else {
      // Update existing location
      const newQuantity = location.quantity + delta
      location = await this.update(location.id, {
        quantity: newQuantity,
        reservedQuantity: location.reservedQuantity
      })
    }

    return location
  }

  /**
   * Reserve quantity
   */
  async reserveQuantity(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<ProductLocation> {
    const location = await this.findByProductAndStore(productId, storeId)

    if (!location) {
      throw new Error('Product location not found')
    }

    const availableQuantity = location.quantity - location.reservedQuantity
    if (availableQuantity < quantity) {
      throw new Error('Insufficient quantity available')
    }

    return await this.update(location.id, {
      quantity: location.quantity,
      reservedQuantity: location.reservedQuantity + quantity
    })
  }

  /**
   * Release reserved quantity
   */
  async releaseReservedQuantity(
    productId: string,
    storeId: string,
    quantity: number
  ): Promise<ProductLocation> {
    const location = await this.findByProductAndStore(productId, storeId)

    if (!location) {
      throw new Error('Product location not found')
    }

    return await this.update(location.id, {
      quantity: location.quantity,
      reservedQuantity: Math.max(0, location.reservedQuantity - quantity)
    })
  }

  /**
   * Soft delete product location
   */
  async softDelete(id: string): Promise<ProductLocation> {
    const now = Date.now()

    this.db.run('UPDATE product_location SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      now,
      now,
      id
    ])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Product location not found after delete')
    }
    return deleted
  }

  /**
   * Map database row to ProductLocation object
   */
  private mapRowToProductLocation(row: any): ProductLocation {
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
