import { ipcMain } from 'electron'
import { ReceiptService } from '../services/receipt.service'
import { Transaction } from '../services/transaction.service'

export class ReceiptController {
  constructor(private receiptService: ReceiptService) {}

  registerHandlers(): void {
    // Print receipt
    ipcMain.handle('receipt:print', async (_, data: Transaction) => {
      try {
        const result = await this.receiptService.printReceipt(data)
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get receipt configuration
    ipcMain.handle('receipt:getConfig', async () => {
      try {
        const config = await this.receiptService.getConfig()
        return { success: true, data: config }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update receipt configuration
    ipcMain.handle('receipt:updateConfig', async (_, config) => {
      try {
        await this.receiptService.updateConfig(config)
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
