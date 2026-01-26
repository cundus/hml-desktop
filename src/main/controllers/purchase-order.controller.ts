import { ipcMain } from 'electron'
import { PurchaseOrderCloudService } from '../services/purchase-order-cloud.service'

export class PurchaseOrderController {
  constructor(private purchaseOrderService: PurchaseOrderCloudService) {}

  registerHandlers(): void {
    // Get all purchase orders
    ipcMain.handle('db:purchaseOrders:getAll', async () => {
      try {
        const orders = await this.purchaseOrderService.findAll()
        return { success: true, data: orders }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get purchase order by ID
    ipcMain.handle('db:purchaseOrders:getById', async (_, id: string) => {
      try {
        const order = await this.purchaseOrderService.findById(id)
        return { success: true, data: order }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get purchase order by code
    ipcMain.handle('db:purchaseOrders:getByCode', async (_, code: string) => {
      try {
        const order = await this.purchaseOrderService.findByCode(code)
        return { success: true, data: order }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get purchase orders by supplier ID
    ipcMain.handle('db:purchaseOrders:getBySupplierId', async (_, supplierId: string) => {
      try {
        const orders = await this.purchaseOrderService.findBySupplierId(supplierId)
        return { success: true, data: orders }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get purchase orders by store ID
    ipcMain.handle('db:purchaseOrders:getByStoreId', async (_, storeId: string) => {
      try {
        const orders = await this.purchaseOrderService.findByStoreId(storeId)
        return { success: true, data: orders }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get purchase orders by status
    ipcMain.handle('db:purchaseOrders:getByStatus', async (_, status: string) => {
      try {
        const orders = await this.purchaseOrderService.findByStatus(status as any)
        return { success: true, data: orders }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create purchase order
    ipcMain.handle('db:purchaseOrders:create', async (_, data) => {
      try {
        const order = await this.purchaseOrderService.create(data)
        return { success: true, data: order }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update purchase order
    ipcMain.handle('db:purchaseOrders:update', async (_, id: string, data) => {
      try {
        const order = await this.purchaseOrderService.update(id, data)
        return { success: true, data: order }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Soft delete purchase order
    ipcMain.handle('db:purchaseOrders:delete', async (_, id: string) => {
      try {
        const order = await this.purchaseOrderService.softDelete(id)
        return { success: true, data: order }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Receive purchase order
    ipcMain.handle('db:purchaseOrders:receive', async (_, id: string) => {
      try {
        const result = await this.purchaseOrderService.receiveOrder(id)
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
