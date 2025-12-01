import { Database } from 'sql.js'
import { CreateProductDto, UpdateProductDto } from '../types/dto'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  unit: string
  cost: string
  categoryId: string | null
  supplierId: string | null
  isService: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
}

export class ProductService {
  constructor(private db: Database) {}

  /**
   * Get all active (non-deleted) products
   */
  async findAll(): Promise<Product[]> {
    const stmt = this.db.prepare('SELECT * FROM product WHERE deleted_at IS NULL ORDER BY name ASC')
    const results: Product[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProduct(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get active products only
   */
  async findActive(): Promise<Product[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM product WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC'
    )
    const results: Product[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProduct(row))
    }
    stmt.free()

    return results
  }

  /**
   * Get product by ID
   */
  async findById(id: string): Promise<Product | undefined> {
    const stmt = this.db.prepare('SELECT * FROM product WHERE id = ?')
    stmt.bind([id])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProduct(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku: string): Promise<Product | undefined> {
    const stmt = this.db.prepare('SELECT * FROM product WHERE sku = ? AND deleted_at IS NULL')
    stmt.bind([sku])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return this.mapRowToProduct(row)
    }
    stmt.free()
    return undefined
  }

  /**
   * Search products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    const searchPattern = `%${query}%`
    const stmt = this.db.prepare(
      'SELECT * FROM product WHERE deleted_at IS NULL AND (name LIKE ? OR sku LIKE ?) LIMIT 50'
    )
    stmt.bind([searchPattern, searchPattern])

    const results: Product[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject()
      results.push(this.mapRowToProduct(row))
    }
    stmt.free()

    return results
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDto): Promise<Product> {
    const id = randomUUID()
    const now = Date.now()

    this.db.run(
      'INSERT INTO product (id, sku, name, description, unit, cost, category_id, supplier_id, is_service, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        data.sku,
        data.name,
        data.description ?? null,
        data.unit,
        data.cost,
        data.categoryId ?? null,
        data.supplierId ?? null,
        data.isService ? 1 : 0,
        data.isActive ? 1 : 0,
        now,
        now
      ]
    )

    saveDb(this.db)

    return {
      id,
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      unit: data.unit,
      cost: data.cost.toString(),
      categoryId: data.categoryId ?? null,
      supplierId: data.supplierId ?? null,
      isService: data.isService ?? false,
      isActive: data.isActive ?? true,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      syncedAt: null,
      deletedAt: null,
      deviceId: null
    }
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error('Product not found')
    }

    const now = Date.now()

    this.db.run(
      'UPDATE product SET name = ?, description = ?, unit = ?, cost = ?, category_id = ?, supplier_id = ?, is_service = ?, is_active = ?, updated_at = ? WHERE id = ?',
      [
        data.name ?? existing.name,
        data.description ?? existing.description ?? null,
        data.unit ?? existing.unit,
        data.cost ?? existing.cost,
        data.categoryId ?? existing.categoryId ?? null,
        data.supplierId ?? existing.supplierId ?? null,
        (data.isService ?? existing.isService) ? 1 : 0,
        (data.isActive ?? existing.isActive) ? 1 : 0,
        now,
        id
      ]
    )

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Product not found after update')
    }
    return updated
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string): Promise<Product> {
    const now = Date.now()

    this.db.run('UPDATE product SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id])

    saveDb(this.db)

    const deleted = await this.findById(id)
    if (!deleted) {
      throw new Error('Product not found after delete')
    }
    return deleted
  }

  /**
   * Restore soft-deleted product
   */
  async restore(id: string): Promise<Product> {
    const now = Date.now()

    this.db.run('UPDATE product SET deleted_at = NULL, updated_at = ? WHERE id = ?', [now, id])

    saveDb(this.db)

    const restored = await this.findById(id)
    if (!restored) {
      throw new Error('Product not found after restore')
    }
    return restored
  }

  /**
   * Toggle product active status
   */
  async toggleActive(id: string): Promise<Product> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error('Product not found')
    }

    const now = Date.now()
    const newActiveStatus = product.isActive ? 0 : 1

    this.db.run('UPDATE product SET is_active = ?, updated_at = ? WHERE id = ?', [
      newActiveStatus,
      now,
      id
    ])

    saveDb(this.db)

    const updated = await this.findById(id)
    if (!updated) {
      throw new Error('Product not found after toggle')
    }
    return updated
  }

  /**
   * Map database row to Product object
   */
  private mapRowToProduct(row: any): Product {
    return {
      id: row.id as string,
      sku: row.sku as string,
      name: row.name as string,
      description: row.description as string | null,
      unit: row.unit as string,
      cost: row.cost as string,
      categoryId: row.category_id as string | null,
      supplierId: row.supplier_id as string | null,
      isService: (row.is_service as number) === 1,
      isActive: (row.is_active as number) === 1,
      createdAt: new Date(row.created_at as number),
      updatedAt: new Date(row.updated_at as number),
      syncedAt: row.synced_at ? new Date(row.synced_at as number) : null,
      deletedAt: row.deleted_at ? new Date(row.deleted_at as number) : null,
      deviceId: row.device_id as string | null
    }
  }
}
