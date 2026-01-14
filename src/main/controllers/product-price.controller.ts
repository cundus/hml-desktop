import { ipcMain } from 'electron'
import { ProductPriceCloudService } from '../services/product-price-cloud.service'

export class ProductPriceController {
  constructor(private productPriceService: ProductPriceCloudService) {}

  registerHandlers(): void {
    // Get all product prices
    ipcMain.handle('db:productPrices:getAll', async () => {
      try {
        const prices = await this.productPriceService.findAll()
        return { success: true, data: prices }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product price by ID
    ipcMain.handle('db:productPrices:getById', async (_, id: string) => {
      try {
        const price = await this.productPriceService.findById(id)
        return { success: true, data: price }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product prices by product ID
    ipcMain.handle('db:productPrices:getByProductId', async (_, productId: string) => {
      try {
        const prices = await this.productPriceService.findByProductId(productId)
        return { success: true, data: prices }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product prices by store ID
    ipcMain.handle('db:productPrices:getByStoreId', async (_, storeId: string) => {
      try {
        const prices = await this.productPriceService.findByStoreId(storeId)
        return { success: true, data: prices }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product price for specific product and store
    ipcMain.handle(
      'db:productPrices:getByProductAndStore',
      async (_, productId: string, storeId: string) => {
        try {
          const price = await this.productPriceService.findByProductAndStore(productId, storeId)
          return { success: true, data: price }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Create product price
    ipcMain.handle('db:productPrices:create', async (_, data) => {
      try {
        const price = await this.productPriceService.create(data)
        return { success: true, data: price }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update product price
    ipcMain.handle('db:productPrices:update', async (_, id: string, data) => {
      try {
        const price = await this.productPriceService.update(id, data)
        return { success: true, data: price }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Soft delete product price
    ipcMain.handle('db:productPrices:delete', async (_, id: string) => {
      try {
        const price = await this.productPriceService.softDelete(id)
        return { success: true, data: price }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Restore product price
    ipcMain.handle('db:productPrices:restore', async (_, id: string) => {
      try {
        const price = await this.productPriceService.restore(id)
        return { success: true, data: price }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
