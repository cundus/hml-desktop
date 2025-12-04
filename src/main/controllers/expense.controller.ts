import { ipcMain } from 'electron'
import { ExpenseService } from '../services/expense.service'

export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  registerHandlers(): void {
    // Get all expenses
    ipcMain.handle('db:expenses:getAll', async () => {
      try {
        const expenses = await this.expenseService.findAll()
        return { success: true, data: expenses }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expense by ID
    ipcMain.handle('db:expenses:getById', async (_, id: string) => {
      try {
        const expense = await this.expenseService.findById(id)
        return { success: true, data: expense }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expenses by shift ID
    ipcMain.handle('db:expenses:getByShiftId', async (_, shiftId: string) => {
      try {
        const expenses = await this.expenseService.findByShiftId(shiftId)
        return { success: true, data: expenses }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expenses by date range
    ipcMain.handle('db:expenses:getByDateRange', async (_, startDate: string, endDate: string) => {
      try {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const expenses = await this.expenseService.findByDateRange(start, end)
        return { success: true, data: expenses }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expense summary by shift
    ipcMain.handle('db:expenses:getSummaryByShift', async (_, shiftId: string) => {
      try {
        const summary = await this.expenseService.getExpenseSummaryByShift(shiftId)
        return { success: true, data: summary }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get expense summary by date range
    ipcMain.handle(
      'db:expenses:getSummaryByDateRange',
      async (_, startDate: string, endDate: string) => {
        try {
          const start = new Date(startDate)
          const end = new Date(endDate)
          const summary = await this.expenseService.getExpenseSummaryByDateRange(start, end)
          return { success: true, data: summary }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Create expense
    ipcMain.handle('db:expenses:create', async (_, data) => {
      try {
        const expense = await this.expenseService.create(data)
        return { success: true, data: expense }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update expense
    ipcMain.handle('db:expenses:update', async (_, id: string, data) => {
      try {
        const expense = await this.expenseService.update(id, data)
        return { success: true, data: expense }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Delete expense
    ipcMain.handle('db:expenses:delete', async (_, id: string) => {
      try {
        await this.expenseService.delete(id)
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
