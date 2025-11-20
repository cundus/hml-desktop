import { ipcMain } from 'electron'
import { ProductLocationService } from '../services/product-location.service'

export class ProductLocationController {
  constructor(private productLocationService: ProductLocationService) {}

  registerHandlers(): void {
    // Get all product locations
    ipcMain.handle('db:productLocations:getAll', async () => {
      try {
        const locations = await this.productLocationService.findAll()
        return { success: true, data: locations }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product location by ID
    ipcMain.handle('db:productLocations:getById', async (_, id: string) => {
      try {
        const location = await this.productLocationService.findById(id)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product locations by product ID
    ipcMain.handle('db:productLocations:getByProductId', async (_, productId: string) => {
      try {
        const locations = await this.productLocationService.findByProductId(productId)
        return { success: true, data: locations }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product locations by store ID
    ipcMain.handle('db:productLocations:getByStoreId', async (_, storeId: string) => {
      try {
        const locations = await this.productLocationService.findByStoreId(storeId)
        return { success: true, data: locations }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get product location for specific product and store
    ipcMain.handle('db:productLocations:getByProductAndStore', async (_, productId: string, storeId: string) => {
      try {
        const location = await this.productLocationService.findByProductAndStore(productId, storeId)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create product location
    ipcMain.handle('db:productLocations:create', async (_, data) => {
      try {
        const location = await this.productLocationService.create(data)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update product location
    ipcMain.handle('db:productLocations:update', async (_, id: string, data) => {
      try {
        const location = await this.productLocationService.update(id, data)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Adjust quantity
    ipcMain.handle('db:productLocations:adjustQuantity', async (_, productId: string, storeId: string, delta: number) => {
      try {
        const location = await this.productLocationService.adjustQuantity(productId, storeId, delta)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Reserve quantity
    ipcMain.handle('db:productLocations:reserveQuantity', async (_, productId: string, storeId: string, quantity: number) => {
      try {
        const location = await this.productLocationService.reserveQuantity(productId, storeId, quantity)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Release reserved quantity
    ipcMain.handle('db:productLocations:releaseReservedQuantity', async (_, productId: string, storeId: string, quantity: number) => {
      try {
        const location = await this.productLocationService.releaseReservedQuantity(productId, storeId, quantity)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Soft delete product location
    ipcMain.handle('db:productLocations:delete', async (_, id: string) => {
      try {
        const location = await this.productLocationService.softDelete(id)
        return { success: true, data: location }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
