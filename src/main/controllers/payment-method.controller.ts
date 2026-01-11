import { ipcMain } from 'electron'
import { PaymentMethodService } from '../services/payment-method.service'

export class PaymentMethodController {
  constructor(private paymentMethodService: PaymentMethodService) {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('paymentMethods:getAll', async () => {
      try {
        const data = await this.paymentMethodService.findAll()
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    ipcMain.handle('paymentMethods:getActive', async () => {
      try {
        const data = await this.paymentMethodService.findActive()
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching active payment methods:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    ipcMain.handle('paymentMethods:getById', async (_, id: string) => {
      try {
        const data = await this.paymentMethodService.findById(id)
        return { success: true, data }
      } catch (error) {
        console.error('Error fetching payment method:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    ipcMain.handle('paymentMethods:create', async (_, data) => {
      try {
        const created = await this.paymentMethodService.create(data)
        return { success: true, data: created }
      } catch (error) {
        console.error('Error creating payment method:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    ipcMain.handle('paymentMethods:update', async (_, id: string, data) => {
      try {
        const updated = await this.paymentMethodService.update(id, data)
        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating payment method:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    ipcMain.handle('paymentMethods:delete', async (_, id: string) => {
      try {
        const deleted = await this.paymentMethodService.softDelete(id)
        return { success: true, data: deleted }
      } catch (error) {
        console.error('Error deleting payment method:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
