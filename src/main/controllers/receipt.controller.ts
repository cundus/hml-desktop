import { ipcMain } from 'electron'
import { ReceiptService } from '../services/receipt.service'
import { Transaction } from '../services/transaction.service'

export interface PrinterStatus {
  connected: boolean
  printerName: string
  lastTest?: Date
}

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

    // Get printer status
    ipcMain.handle('printer:getStatus', async () => {
      try {
        const status = await this.receiptService.getPrinterStatus()
        return { success: true, data: status }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Test print
    ipcMain.handle('printer:testPrint', async () => {
      try {
        const result = await this.receiptService.testPrint()
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Print expense report
    ipcMain.handle('printer:printExpenseReport', async (_, data) => {
      try {
        const result = await this.receiptService.printExpenseReport(data)
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Print settlement report
    ipcMain.handle('printer:printSettlementReport', async (_, data) => {
      try {
        const result = await this.receiptService.printSettlementReport(data)
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
