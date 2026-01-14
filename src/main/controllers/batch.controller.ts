import { ipcMain } from 'electron'
import { BatchCloudService } from '../services/batch-cloud.service'

export class BatchController {
  constructor(private batchService: BatchCloudService) {}

  registerHandlers(): void {
    // Get all batches
    ipcMain.handle('db:batches:getAll', async () => {
      try {
        const batches = await this.batchService.findAll()
        return { success: true, data: batches }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get batch by ID
    ipcMain.handle('db:batches:getById', async (_, id: string) => {
      try {
        const batch = await this.batchService.findById(id)
        return { success: true, data: batch }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get batch by code
    ipcMain.handle('db:batches:getByCode', async (_, code: string) => {
      try {
        const batch = await this.batchService.findByCode(code)
        return { success: true, data: batch }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get batches by product ID
    ipcMain.handle('db:batches:getByProductId', async (_, productId: string) => {
      try {
        const batches = await this.batchService.findByProductId(productId)
        return { success: true, data: batches }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expiring batches
    ipcMain.handle('db:batches:getExpiring', async (_, days: number) => {
      try {
        const batches = await this.batchService.findExpiring(days)
        return { success: true, data: batches }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create batch
    ipcMain.handle('db:batches:create', async (_, data) => {
      try {
        const batch = await this.batchService.create(data)
        return { success: true, data: batch }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update batch
    ipcMain.handle('db:batches:update', async (_, id: string, data) => {
      try {
        const batch = await this.batchService.update(id, data)
        return { success: true, data: batch }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Soft delete batch
    ipcMain.handle('db:batches:delete', async (_, id: string) => {
      try {
        const batch = await this.batchService.softDelete(id)
        return { success: true, data: batch }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
