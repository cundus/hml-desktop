import { PrismaClient } from '@prisma/client'
import { Product } from '../prisma/client'
import { CreateProductDto, UpdateProductDto } from '../types/dto'

export class ProductService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all active (non-deleted) products
   */
  async findAll(): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get active products only
   */
  async findActive(): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true
      },
      include: {
        category: true
      },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get product by ID
   */
  async findById(id: string): Promise<Product | null> {
    return await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        productPrices: {
          where: {
            deletedAt: null
          }
        },
        productLocations: true
      }
    })
  }

  /**
   * Get product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    return await this.prisma.product.findFirst({
      where: {
        sku,
        deletedAt: null
      },
      include: {
        category: true
      }
    })
  }

  /**
   * Search products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        category: true
      },
      take: 50
    })
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDto): Promise<Product> {
    return await this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        unit: data.unit,
        cost: data.cost,
        categoryId: data.categoryId,
        isActive: data.isActive ?? true
      },
      include: {
        category: true
      }
    })
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductDto): Promise<Product> {
    return await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        unit: data.unit,
        cost: data.cost,
        categoryId: data.categoryId,
        isActive: data.isActive
      },
      include: {
        category: true
      }
    })
  }

  /**
   * Soft delete product
   */
  async softDelete(id: string): Promise<Product> {
    return await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  /**
   * Restore soft-deleted product
   */
  async restore(id: string): Promise<Product> {
    return await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null }
    })
  }

  /**
   * Toggle product active status
   */
  async toggleActive(id: string): Promise<Product> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error('Product not found')
    }

    return await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive }
    })
  }
}
