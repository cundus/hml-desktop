import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, isNull, and, or, like, asc, desc } from 'drizzle-orm'
import * as schema from '../db/schema'
import { products, Product } from '../db/schema'
import { CreateProductDto, UpdateProductDto } from '../types/dto'

export class ProductService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Get all active (non-deleted) products
   */
  async findAll(): Promise<Product[]> {
    return await this.db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(asc(products.name))
  }

  /**
   * Get active products only
   */
  async findActive(): Promise<Product[]> {
    return await this.db
      .select()
      .from(products)
      .where(and(
        isNull(products.deletedAt),
        eq(products.isActive, true)
      ))
      .orderBy(asc(products.name))
  }

  /**
   * Get product by ID
   */
  async findById(id: string): Promise<Product | undefined> {
    const result = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
    
    return result[0]
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku: string): Promise<Product | undefined> {
    const result = await this.db
      .select()
      .from(products)
      .where(and(
        eq(products.sku, sku),
        isNull(products.deletedAt)
      ))
      .limit(1)
    
    return result[0]
  }

  /**
   * Search products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    const searchPattern = `%${query}%`
    
    return await this.db
      .select()
      .from(products)
      .where(and(
        isNull(products.deletedAt),
        or(
          like(products.name, searchPattern),
          like(products.sku, searchPattern)
        )
      ))
      .limit(50)
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDto): Promise<Product> {
    const result = await this.db
      .insert(products)
      .values({
        sku: data.sku,
        name: data.name,
        description: data.description,
        unit: data.unit,
        cost: data.cost,
        categoryId: data.categoryId,
        isActive: data.isActive ?? true
      })
      .returning()
    
    return result[0]
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductDto): Promise<Product> {
    const result = await this.db
      .update(products)
      .set({
        name: data.name,
        description: data.description,
        unit: data.unit,
        cost: data.cost,
        categoryId: data.categoryId,
        isActive: data.isActive,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string): Promise<Product> {
    const result = await this.db
      .update(products)
      .set({ 
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Restore soft-deleted product
   */
  async restore(id: string): Promise<Product> {
    const result = await this.db
      .update(products)
      .set({ 
        deletedAt: null,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning()
    
    return result[0]
  }

  /**
   * Toggle product active status
   */
  async toggleActive(id: string): Promise<Product> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error('Product not found')
    }

    const result = await this.db
      .update(products)
      .set({ 
        isActive: !product.isActive,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning()
    
    return result[0]
  }
}
