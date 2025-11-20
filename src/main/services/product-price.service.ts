import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

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

export class ProductPriceService {
  constructor(private db: Database) {}

  /**
   * Get all active product prices
   */
  async findAll(): Promise<ProductPrice[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_price WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    const results: ProductPrice[] = []
    
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductPrice(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get product price by ID
   */
  async findById(id: string): Promise<ProductPrice | undefined> {
    const stmt = this.db.prepare('SELECT * FROM product_price WHERE id = ?')
    stmt.bind([id])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProductPrice(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get product prices by product ID
   */
  async findByProductId(productId: string): Promise<ProductPrice[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_price WHERE product_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId])
    
    const results: ProductPrice[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductPrice(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get product prices by store ID
   */
  async findByStoreId(storeId: string): Promise<ProductPrice[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_price WHERE store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([storeId])
    
    const results: ProductPrice[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProductPrice(row))
    }
    stmt.free()
    
    return results
  }

  /**
   * Get product price for specific product and store
   */
  async findByProductAndStore(productId: string, storeId: string): Promise<ProductPrice | undefined> {
    const stmt = this.db.prepare(
      'SELECT * FROM product_price WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL'
    )
    stmt.bind([productId, storeId])
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProductPrice(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Create a new product price
   */
  async create(data: CreateProductPriceDto): Promise<ProductPrice> {
    const id = randomUUID()
    const now = Date.now()
    
    this.db.run(
      'INSERT INTO product_price (id, product_id, store_id, price, cost, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.productId, data.storeId, data.price, data.cost, data.isActive ? 1 : 0, now, now]
    )
    
    saveDb(this.db)
    
    return {
      id,
      productId: data.productId,
      storeId: data.storeId,
      price: data.price,
      cost: data.cost,
      isActive: data.isActive ?? true,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update product price
   */
  async update(id: string, data: UpdateProductPriceDto): Promise<ProductPrice> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE product_price SET price = ?, cost = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [data.price, data.cost, data.isActive ? 1 : 0, now, id]
    )
    
    saveDb(this.db)
    
    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Product price not found after update')
    }
    return updated
  }

  /**
   * Soft delete product price
   */
  async softDelete(id: string): Promise<ProductPrice> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE product_price SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    )
    
    saveDb(this.db)
    
    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Product price not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted product price
   */
  async restore(id: string): Promise<ProductPrice> {
    const now = Date.now()
    
    this.db.run(
      'UPDATE product_price SET deleted_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    )
    
    saveDb(this.db)
    
    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Product price not found after restore')
    }
    return restored
  }

  /**
   * Map database row to ProductPrice object
   */
  private mapRowToProductPrice(row: any): ProductPrice {
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
