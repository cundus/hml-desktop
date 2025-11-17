/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProductService } from '../services/product.service'
import { CreateProductDto, UpdateProductDto } from '../types/dto'
import { ApiResponse } from '../types/response'

export class ProductController {
  constructor(private productService: ProductService) {}

  /**
   * Register all IPC handlers for product operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:products:getAll', this.getAll.bind(this))
    ipcMain.handle('db:products:getActive', this.getActive.bind(this))
    ipcMain.handle('db:products:getById', this.getById.bind(this))
    ipcMain.handle('db:products:search', this.search.bind(this))
    ipcMain.handle('db:products:create', this.create.bind(this))
    ipcMain.handle('db:products:update', this.update.bind(this))
    ipcMain.handle('db:products:softDelete', this.softDelete.bind(this))
    ipcMain.handle('db:products:restore', this.restore.bind(this))
    ipcMain.handle('db:products:toggleActive', this.toggleActive.bind(this))
  }

  /**
   * Get all products
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const products = await this.productService.findAll()
      return {
        success: true,
        data: products
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      }
    }
  }

  /**
   * Get active products only
   */
  private async getActive(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const products = await this.productService.findActive()
      return {
        success: true,
        data: products
      }
    } catch (error) {
      console.error('Error fetching active products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active products'
      }
    }
  }

  /**
   * Get product by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const product = await this.productService.findById(id)
      if (!product) {
        return {
          success: false,
          error: 'Product not found'
        }
      }
      return {
        success: true,
        data: product
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product'
      }
    }
  }

  /**
   * Search products
   */
  private async search(_event: IpcMainInvokeEvent, query: string): Promise<ApiResponse> {
    try {
      const products = await this.productService.search(query)
      return {
        success: true,
        data: products
      }
    } catch (error) {
      console.error('Error searching products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search products'
      }
    }
  }

  /**
   * Create new product
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateProductDto): Promise<ApiResponse> {
    try {
      // Check if SKU already exists
      const existing = await this.productService.findBySku(data.sku)
      if (existing) {
        return {
          success: false,
          error: 'SKU already exists'
        }
      }

      const product = await this.productService.create(data)
      return {
        success: true,
        data: product,
        message: 'Product created successfully'
      }
    } catch (error) {
      console.error('Error creating product:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product'
      }
    }
  }

  /**
   * Update product
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateProductDto
  ): Promise<ApiResponse> {
    try {
      // Check if product exists
      const existing = await this.productService.findById(id)
      if (!existing) {
        return {
          success: false,
          error: 'Product not found'
        }
      }

      const product = await this.productService.update(id, data)
      return {
        success: true,
        data: product,
        message: 'Product updated successfully'
      }
    } catch (error) {
      console.error('Error updating product:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product'
      }
    }
  }

  /**
   * Soft delete product
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const product = await this.productService.softDelete(id)
      return {
        success: true,
        data: product,
        message: 'Product deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product'
      }
    }
  }

  /**
   * Restore soft-deleted product
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const product = await this.productService.restore(id)
      return {
        success: true,
        data: product,
        message: 'Product restored successfully'
      }
    } catch (error) {
      console.error('Error restoring product:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore product'
      }
    }
  }

  /**
   * Toggle product active status
   */
  private async toggleActive(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const product = await this.productService.toggleActive(id)
      return {
        success: true,
        data: product,
        message: 'Product status updated successfully'
      }
    } catch (error) {
      console.error('Error toggling product status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle product status'
      }
    }
  }
}
