import { ipcMain } from 'electron'
import { TransactionService } from '../services/transaction.service'

export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  registerHandlers(): void {
    // Get all transactions
    ipcMain.handle('db:transactions:getAll', async () => {
      try {
        const transactions = await this.transactionService.findAll()
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get transaction by ID
    ipcMain.handle('db:transactions:getById', async (_, id: string) => {
      try {
        const transaction = await this.transactionService.findById(id)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get transaction by code
    ipcMain.handle('db:transactions:getByCode', async (_, code: string) => {
      try {
        const transaction = await this.transactionService.findByCode(code)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get transactions by store ID
    ipcMain.handle('db:transactions:getByStoreId', async (_, storeId: string) => {
      try {
        const transactions = await this.transactionService.findByStoreId(storeId)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get transactions by customer ID
    ipcMain.handle('db:transactions:getByCustomerId', async (_, customerId: string) => {
      try {
        const transactions = await this.transactionService.findByCustomerId(customerId)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get transactions by user ID
    ipcMain.handle('db:transactions:getByUserId', async (_, userId: string) => {
      try {
        const transactions = await this.transactionService.findByUserId(userId)
        return { success: true, data: transactions }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create transaction
    ipcMain.handle('db:transactions:create', async (_, data) => {
      try {
        const transaction = await this.transactionService.create(data)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get sales summary
    ipcMain.handle(
      'db:transactions:getSalesSummary',
      async (_, storeId: string, startDate?: string, endDate?: string) => {
        try {
          const start = startDate ? new Date(startDate) : undefined
          const end = endDate ? new Date(endDate) : undefined
          const summary = await this.transactionService.getSalesSummary(storeId, start, end)
          return { success: true, data: summary }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Soft delete transaction
    ipcMain.handle('db:transactions:delete', async (_, id: string) => {
      try {
        const transaction = await this.transactionService.softDelete(id)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Restore transaction
    ipcMain.handle('db:transactions:restore', async (_, id: string) => {
      try {
        const transaction = await this.transactionService.restore(id)
        return { success: true, data: transaction }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get dashboard stats
    ipcMain.handle('db:transactions:getDashboardStats', async () => {
      try {
        const stats = await this.transactionService.getDashboardStats()
        return { success: true, data: stats }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
