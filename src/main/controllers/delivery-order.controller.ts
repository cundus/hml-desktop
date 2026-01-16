import { ipcMain } from 'electron'
import { DeliveryOrderService, CreateDeliveryOrderDto } from '../services/delivery-order.service'

export function registerDeliveryOrderController(service: DeliveryOrderService): void {
  ipcMain.handle('db:deliveryOrder:getAll', async () => {
    try {
      const orders = await service.getAll()
      return { success: true, data: orders }
    } catch (error) {
      console.error('Error getting delivery orders:', error)
      return { success: false, error: 'Failed to get delivery orders' }
    }
  })

  ipcMain.handle('db:deliveryOrder:findById', async (_, id: string) => {
    try {
      const order = await service.findById(id)
      return { success: true, data: order }
    } catch (error) {
      console.error('Error finding delivery order:', error)
      return { success: false, error: 'Failed to find delivery order' }
    }
  })

  ipcMain.handle('db:deliveryOrder:findByTransactionId', async (_, transactionId: string) => {
    try {
      const order = await service.findByTransactionId(transactionId)
      return { success: true, data: order }
    } catch (error) {
      console.error('Error finding delivery order by transaction:', error)
      return { success: false, error: 'Failed to find delivery order' }
    }
  })

  ipcMain.handle('db:deliveryOrder:create', async (_, data: CreateDeliveryOrderDto) => {
    try {
      // Convert tanggal string to Date if needed
      const dto = {
        ...data,
        tanggal: new Date(data.tanggal)
      }
      const order = await service.create(dto)
      return { success: true, data: order }
    } catch (error) {
      console.error('Error creating delivery order:', error)
      return { success: false, error: 'Failed to create delivery order' }
    }
  })

  ipcMain.handle('db:deliveryOrder:markAsPrinted', async (_, id: string) => {
    try {
      const success = await service.markAsPrinted(id)
      return { success, data: success }
    } catch (error) {
      console.error('Error marking delivery order as printed:', error)
      return { success: false, error: 'Failed to mark as printed' }
    }
  })

  ipcMain.handle('db:deliveryOrder:delete', async (_, id: string) => {
    try {
      const success = await service.delete(id)
      return { success, data: success }
    } catch (error) {
      console.error('Error deleting delivery order:', error)
      return { success: false, error: 'Failed to delete delivery order' }
    }
  })
}
