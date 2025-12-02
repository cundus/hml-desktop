import { ipcMain } from 'electron'
import { StockTransactionService } from '../services/stock-transaction.service'

export class StockTransactionController {
  constructor(private stockTransactionService: StockTransactionService) {}

  registerHandlers(): void {
    // Get all stock transactions
    ipcMain.handle('db:stockTransactions:getAll', async () => {
      try {
        const transactions = await this.stockTransactionService.findAll()
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock transaction by ID
    ipcMain.handle('db:stockTransactions:getById', async (_, id: string) => {
      try {
        const transaction = await this.stockTransactionService.findById(id)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock transactions by product ID
    ipcMain.handle('db:stockTransactions:getByProductId', async (_, productId: string) => {
      try {
        const transactions = await this.stockTransactionService.findByProductId(productId)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock transactions by store ID
    ipcMain.handle('db:stockTransactions:getByStoreId', async (_, storeId: string) => {
      try {
        const transactions = await this.stockTransactionService.findByStoreId(storeId)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock transactions by type
    ipcMain.handle('db:stockTransactions:getByType', async (_, type: string) => {
      try {
        const transactions = await this.stockTransactionService.findByType(type as any)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock transactions by reference
    ipcMain.handle('db:stockTransactions:getByReference', async (_, reference: string) => {
      try {
        const transactions = await this.stockTransactionService.findByReference(reference)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create stock transaction
    ipcMain.handle('db:stockTransactions:create', async (_, data) => {
      try {
        const transaction = await this.stockTransactionService.create(data)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get stock summary
    ipcMain.handle(
      'db:stockTransactions:getStockSummary',
      async (_, productId: string, storeId: string) => {
        try {
          const summary = await this.stockTransactionService.getStockSummary(productId, storeId)
          return { success: true, data: summary }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Soft delete stock transaction
    ipcMain.handle('db:stockTransactions:delete', async (_, id: string) => {
      try {
        const transaction = await this.stockTransactionService.softDelete(id)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
