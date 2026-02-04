import { ipcMain } from 'electron'
import { DamagedGoodsService } from '../services/damaged-goods.service'

export class DamagedGoodsController {
  constructor(private damagedGoodsService: DamagedGoodsService) {}

  registerHandlers(): void {
    // Get all damaged goods
    ipcMain.handle('db:damagedGoods:getAll', async () => {
      try {
        const items = await this.damagedGoodsService.findAll()
        return { success: true, data: items }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get damaged goods by ID
    ipcMain.handle('db:damagedGoods:getById', async (_, id: string) => {
      try {
        const item = await this.damagedGoodsService.findById(id)
        return { success: true, data: item }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get damaged goods by store ID
    ipcMain.handle('db:damagedGoods:getByStoreId', async (_, storeId: string) => {
      try {
        const items = await this.damagedGoodsService.findByStoreId(storeId)
        return { success: true, data: items }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get damaged goods by date range
    ipcMain.handle('db:damagedGoods:getByDateRange', async (_, startDate: string, endDate: string) => {
      try {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const items = await this.damagedGoodsService.findByDateRange(start, end)
        return { success: true, data: items }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get total loss by date range (for financial reports)
    ipcMain.handle(
      'db:damagedGoods:getTotalLossByDateRange',
      async (_, startDate: string, endDate: string) => {
        try {
          const start = new Date(startDate)
          const end = new Date(endDate)
          const summary = await this.damagedGoodsService.getTotalLossByDateRange(start, end)
          return { success: true, data: summary }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Create damaged goods record
    ipcMain.handle('db:damagedGoods:create', async (_, data) => {
      try {
        const item = await this.damagedGoodsService.create(data)
        return { success: true, data: item }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Delete damaged goods record (soft delete)
    ipcMain.handle('db:damagedGoods:delete', async (_, id: string) => {
      try {
        await this.damagedGoodsService.softDelete(id)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
