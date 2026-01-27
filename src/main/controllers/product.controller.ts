/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { CategoryCloudService } from '../services/category-cloud.service'
import { ExcelColumn, ExcelService } from '../services/excel.service'
import { PriceCategoryCloudService } from '../services/price-category-cloud.service'
import { PricingCloudService } from '../services/pricing-cloud.service'
import { ProductCloudService } from '../services/product-cloud.service'
import { ProductLocationCloudService } from '../services/product-location-cloud.service'
import { StockTransactionCloudService } from '../services/stock-transaction-cloud.service'
import { CreateProductDto, UpdateProductDto } from '../types/dto'
import { ApiResponse } from '../types/response'

// Excel column configuration for products
const PRODUCT_EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'SKU', key: 'sku', width: 15 },
  { header: 'Nama Produk', key: 'name', width: 30 },
  { header: 'Deskripsi', key: 'description', width: 40 },
  { header: 'Satuan', key: 'unit', width: 10 },
  { header: 'Harga Pokok', key: 'cost', width: 15 },
  { header: 'Kategori', key: 'categoryName', width: 20 },
  { header: 'Aktif', key: 'isActive', width: 10 }
]

export class ProductController {
  private excelService: ExcelService

  constructor(
    private productService: ProductCloudService,
    private categoryService: CategoryCloudService,
    private pricingService: PricingCloudService,
    private priceCategoryService: PriceCategoryCloudService,
    private stockTransactionService: StockTransactionCloudService,
    private productLocationService: ProductLocationCloudService
  ) {
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
    ipcMain.handle('db:products:delete', this.delete.bind(this))
    ipcMain.handle('db:products:toggleActive', this.toggleActive.bind(this))
    ipcMain.handle('db:products:exportExcel', this.exportExcel.bind(this))
    ipcMain.handle('db:products:importBatch', this.importBatch.bind(this))
    ipcMain.handle('db:products:downloadTemplate', this.downloadTemplate.bind(this))
    ipcMain.handle('db:products:deleteBatch', this.deleteBatch.bind(this))
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
   * Delete product (Hard Delete)
   */
  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const product = await this.productService.delete(id)
      return {
        success: true,
        data: product,
        message: 'Product permanently deleted'
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
   * Delete multiple products (Batch Delete)
   */
  private async deleteBatch(_event: IpcMainInvokeEvent, ids: string[]): Promise<ApiResponse> {
    try {
      if (!ids || ids.length === 0) {
        return { success: false, error: 'No product IDs provided' }
      }

      const result = await this.productService.deleteMany(ids)
      return {
        success: true,
        data: result,
        message: `Deleted ${result.successCount} products`
      }
    } catch (error) {
      console.error('Error batch deleting products:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete products'
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
   * Import batch (logic ported from importExcel but for direct data)
   */
  private async importBatch(
    _event: IpcMainInvokeEvent,
    data: any[],
    storeId: string,
    performedBy: string
  ): Promise<ApiResponse> {
    try {
      if (!data || data.length === 0) {
        return { success: false, error: 'Tidak ada data untuk diimpor' }
      }

      // Pre-load necessary data
      const categoryCache = new Map<string, string>()
      const priceCategories = await this.priceCategoryService.getAll()

      let successCount = 0
      let failureCount = 0 // Using failureCount instead of errorCount to match interface? Core.ts said errorCount? Core said failureCount: number
      // Wait, core.ts said: successCount: number, errorCount: number (in return type of importExcel) but importBatch return said: failureCount.
      // Step 2869: changed to successCount, failureCount.

      // We will track skipCount too but merge into handled or specific field?
      // Interface in core.ts: successCount, failureCount, errors?

      let skipCount = 0
      let categoriesCreated = 0
      const errors: string[] = []

      // Begin processing
      // Note: Ideally wrap in a Transaction. BUT services usage implies separate connections/logic.
      // ProductService uses `db`. StockTransaction uses `db`.
      // We can't easily wrap strictly across services without exposing `db.transaction(...)`.
      // For now, we will process sequentially and accumulate errors.

      for (const row of data) {
        try {
          const sku = String(row.sku || '').trim()
          const name = String(row.name || '').trim()

          if (!sku || !name) {
            failureCount++
            errors.push(`Row without SKU/Name`)
            continue
          }

          // Check Existing - Update if exists instead of skipping
          let existing = await this.productService.findBySku(sku)
          let product: { id: string }

          // Category Resolution
          let categoryId = row.category ? categoryCache.get(row.category.toLowerCase()) : undefined
          if (row.category && !categoryId) {
            const catName = row.category.trim()
            let cat = await this.categoryService.findByName(catName)
            if (!cat) {
              cat = await this.categoryService.create({ name: catName })
              categoriesCreated++
            }
            if (cat) {
              categoryId = cat.id
              categoryCache.set(catName.toLowerCase(), categoryId)
            }
          }

          if (existing) {
            // Update existing product
            const updatedProduct = await this.productService.update(existing.id, {
              name,
              description: row.description,
              unit: row.unit || 'PCS',
              cost: Number(row.cost || 0),
              weight: Number(row.weight || 0),
              categoryId,
              isActive: true
            })
            product = { id: updatedProduct.id }
          } else {
            // Create new product
            product = await this.productService.create({
              sku,
              name,
              description: row.description,
              unit: row.unit || 'PCS',
              cost: Number(row.cost || 0),
              weight: Number(row.weight || 0),
              categoryId,
              isActive: true
            })
          }

          // Handle Prices
          // row.price_general -> 'Umum' (or default)
          // row.price_wholesale -> 'Grosir' (or 2nd)

          // We need UOM ID. Product creation auto-creates base UOM.
          // We need to fetch that UOM.
          // Optimized: ProductService.create could return UOM ID? No.
          // We fetch UOMs.
          const uoms = await this.pricingService.getProductUomsByProduct(product.id)
          const baseUom = uoms.find((u) => u.isBaseUnit)

          // Handle Prices (Fixed 1, 2, 3)
          // Frontend sends prices: [p1, p2, p3]
          if (Array.isArray(row.prices) && baseUom) {
            const prices = row.prices as number[]

            // Map index 0->Cat[0], 1->Cat[1], 2->Cat[2]
            // We use priceCategories which is fetched above (assumed sorted by sort_order)

            for (let i = 0; i < prices.length; i++) {
              const priceVal = Number(prices[i]) || 0
              if (priceVal > 0) {
                const targetCat = priceCategories[i]
                if (targetCat) {
                  // Write Store Price
                  await this.pricingService.upsertStorePrice(
                    product.id,
                    baseUom.uomId,
                    targetCat.id,
                    storeId,
                    String(priceVal)
                  )
                  // Write HQ/Default Price (so it appears in Lists as Base Price)
                  await this.pricingService.upsertCategoryPrice(
                    product.id,
                    baseUom.uomId,
                    targetCat.id,
                    String(priceVal)
                  )
                }
              }
            }
          }

          // Handle Stock
          console.log('row.stock', JSON.stringify(row.stock, null, 2))
          if (row.stock && Number(row.stock) > 0) {
            await this.stockTransactionService.create({
              productId: product.id,
              storeId,
              type: 'INBOUND', // Initial stock
              quantity: Number(row.stock),
              reference: 'Initial Import',
              performedBy
            })
            // Update physical stock location
            await this.productLocationService.adjustQuantity(product.id, storeId, Number(row.stock))
          }

          successCount++
        } catch (err) {
          failureCount++
          errors.push(`SKU ${row.sku}: ${err instanceof Error ? err.message : 'Error'}`)
        }
      }

      return {
        success: true,
        data: {
          successCount,
          failureCount,
          errors
        },
        message: `Import selesai: ${successCount} sukses, ${skipCount} dilewati, ${failureCount} gagal`
      }
    } catch (error) {
      console.error('Batch import failed', error)
      return { success: false, error: 'Batch import failed' }
    }
  }

  /**
   * Download Excel template for product import
   */
  private async downloadTemplate(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      // Fetch price categories for dynamic columns
      const priceCategoriesRes = await this.priceCategoryService.getAll()
      const priceCategories = priceCategoriesRes || []

      // Create dynamic columns
      const dynamicColumns = [...PRODUCT_EXCEL_COLUMNS]

      // Add price columns
      priceCategories.forEach((pc, index) => {
        dynamicColumns.splice(5 + index, 0, {
          header: `Harga ${index + 1} (${pc.name})`,
          key: `price${index + 1}`,
          width: 20
        })
      })

      // Add Stock column at the end
      dynamicColumns.push({ header: 'Stok Awal', key: 'stock', width: 15 })

      const sampleData = [
        {
          sku: 'PRD001',
          name: 'Contoh Produk 1',
          description: 'Deskripsi produk',
          unit: 'PCS',
          cost: 10000,
          categoryId: '',
          isActive: 'Ya',
          stock: 10,
          // Add sample prices
          ...priceCategories.reduce(
            (acc, _, idx) => ({ ...acc, [`price${idx + 1}`]: 10000 + idx * 1000 }),
            {}
          )
        },
        {
          sku: 'PRD002',
          name: 'Contoh Produk 2',
          description: '',
          unit: 'BOX',
          cost: 25000,
          categoryId: '',
          isActive: 'Ya',
          stock: 5,
          ...priceCategories.reduce(
            (acc, _, idx) => ({ ...acc, [`price${idx + 1}`]: 25000 + idx * 1000 }),
            {}
          )
        }
      ]

      const result = await this.excelService.generateTemplate(
        dynamicColumns,
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
