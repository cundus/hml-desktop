/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProductService } from '../services/product.service'
import { ExcelService, ExcelColumn } from '../services/excel.service'
import { CreateProductDto, UpdateProductDto } from '../types/dto'
import { ApiResponse } from '../types/response'

// Excel column configuration for products
const PRODUCT_EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'SKU', key: 'sku', width: 15 },
  { header: 'Nama Produk', key: 'name', width: 30 },
  { header: 'Deskripsi', key: 'description', width: 40 },
  { header: 'Satuan', key: 'unit', width: 10 },
  { header: 'Harga Pokok', key: 'cost', width: 15 },
  { header: 'Kategori ID', key: 'categoryId', width: 20 },
  { header: 'Aktif', key: 'isActive', width: 10 }
]

// Excel header to field mapping for import
const PRODUCT_COLUMN_MAPPING: Record<string, string> = {
  SKU: 'sku',
  'Nama Produk': 'name',
  Deskripsi: 'description',
  Satuan: 'unit',
  'Harga Pokok': 'cost',
  'Kategori ID': 'categoryId',
  Aktif: 'isActive'
}

export class ProductController {
  private excelService: ExcelService

  constructor(private productService: ProductService) {
    this.excelService = new ExcelService()
  }

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
    ipcMain.handle('db:products:exportExcel', this.exportExcel.bind(this))
    ipcMain.handle('db:products:importExcel', this.importExcel.bind(this))
    ipcMain.handle('db:products:downloadTemplate', this.downloadTemplate.bind(this))
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

  /**
   * Export products to Excel
   */
  private async exportExcel(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const products = await this.productService.findAll()
      const exportData = products.map((p) => ({
        sku: p.sku,
        name: p.name,
        description: p.description || '',
        unit: p.unit,
        cost: p.cost,
        categoryId: p.categoryId || '',
        isActive: p.isActive
      }))

      const result = await this.excelService.exportToExcel(
        exportData,
        PRODUCT_EXCEL_COLUMNS,
        `produk-${new Date().toISOString().split('T')[0]}.xlsx`
      )

      if (result.success) {
        return {
          success: true,
          data: { filePath: result.filePath },
          message: `Berhasil mengekspor ${products.length} produk`
        }
      } else {
        return {
          success: false,
          error: result.error || 'Export gagal'
        }
      }
    } catch (error) {
      console.error('Error exporting products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export gagal'
      }
    }
  }

  /**
   * Import products from Excel
   */
  private async importExcel(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const result = await this.excelService.importFromExcel<CreateProductDto>(
        PRODUCT_COLUMN_MAPPING,
        (row, rowIndex) => {
          const sku = String(row.sku || '').trim()
          const name = String(row.name || '').trim()
          const unit = String(row.unit || 'PCS').trim()
          const cost = row.cost

          // Validate required fields
          if (!sku) {
            return { valid: false, error: `Baris ${rowIndex}: SKU wajib diisi` }
          }
          if (!name) {
            return { valid: false, error: `Baris ${rowIndex}: Nama produk wajib diisi` }
          }

          // Parse isActive
          let isActive = true
          const isActiveValue = row.isActive
          if (typeof isActiveValue === 'boolean') {
            isActive = isActiveValue
          } else if (typeof isActiveValue === 'string') {
            const lower = isActiveValue.toLowerCase().trim()
            isActive = lower === 'ya' || lower === 'yes' || lower === 'true' || lower === '1'
          } else if (typeof isActiveValue === 'number') {
            isActive = isActiveValue === 1
          }

          return {
            valid: true,
            data: {
              sku,
              name,
              description: String(row.description || ''),
              unit,
              cost: Number(cost) || 0,
              categoryId: String(row.categoryId || '') || undefined,
              isActive
            }
          }
        }
      )

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          error: result.errors?.join('\n') || 'Tidak ada data valid untuk diimpor'
        }
      }

      // Import products one by one
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []

      for (const productData of result.data) {
        try {
          // Check if SKU already exists
          const existing = await this.productService.findBySku(productData.sku)
          if (existing) {
            skipCount++
            continue // Skip existing products
          }

          await this.productService.create(productData)
          successCount++
        } catch (err) {
          errors.push(`SKU ${productData.sku}: ${err instanceof Error ? err.message : 'Gagal'}`)
        }
      }

      const message = `Import selesai: ${successCount} berhasil, ${skipCount} dilewati (sudah ada)${errors.length > 0 ? `, ${errors.length} gagal` : ''}`

      return {
        success: true,
        data: {
          totalRows: result.totalRows,
          successCount,
          skipCount,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined
        },
        message
      }
    } catch (error) {
      console.error('Error importing products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import gagal'
      }
    }
  }

  /**
   * Download Excel template for product import
   */
  private async downloadTemplate(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const sampleData = [
        {
          sku: 'PRD001',
          name: 'Contoh Produk 1',
          description: 'Deskripsi produk',
          unit: 'PCS',
          cost: 10000,
          categoryId: '',
          isActive: 'Ya'
        },
        {
          sku: 'PRD002',
          name: 'Contoh Produk 2',
          description: '',
          unit: 'BOX',
          cost: 25000,
          categoryId: '',
          isActive: 'Ya'
        }
      ]

      const result = await this.excelService.generateTemplate(
        PRODUCT_EXCEL_COLUMNS,
        sampleData,
        'template-produk.xlsx'
      )

      if (result.success) {
        return {
          success: true,
          data: { filePath: result.filePath },
          message: 'Template berhasil diunduh'
        }
      } else {
        return {
          success: false,
          error: result.error || 'Gagal membuat template'
        }
      }
    } catch (error) {
      console.error('Error generating template:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal membuat template'
      }
    }
  }
}
