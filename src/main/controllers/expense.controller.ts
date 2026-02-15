import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ExpenseCloudService } from '../services/expense-cloud.service'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class ExpenseController {
  constructor(
    private db: Database,
    private expenseService: ExpenseCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:expenses:getAll', requirePermission(this.db, 'operations.expense.view', this.getAll.bind(this)))
    ipcMain.handle('db:expenses:getById', requirePermission(this.db, 'operations.expense.view', this.getById.bind(this)))
    ipcMain.handle('db:expenses:getByShiftId', requirePermission(this.db, 'operations.expense.view', this.getByShiftId.bind(this)))
    ipcMain.handle('db:expenses:getByDateRange', requirePermission(this.db, 'operations.expense.view', this.getByDateRange.bind(this)))
    ipcMain.handle('db:expenses:getSummaryByShift', requirePermission(this.db, 'operations.expense.view', this.getSummaryByShift.bind(this)))
    ipcMain.handle('db:expenses:getSummaryByDateRange', requirePermission(this.db, 'operations.expense.view', this.getSummaryByDateRange.bind(this)))
    ipcMain.handle('db:expenses:create', requirePermission(this.db, 'operations.expense.create', this.create.bind(this)))
    ipcMain.handle('db:expenses:update', requirePermission(this.db, 'operations.expense.create', this.update.bind(this)))
    ipcMain.handle('db:expenses:delete', requirePermission(this.db, 'operations.expense.delete', this.delete.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const expenses = await this.expenseService.findAll()
      return { success: true, data: expenses }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const expense = await this.expenseService.findById(id)
      return { success: true, data: expense }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByShiftId(_event: IpcMainInvokeEvent, shiftId: string): Promise<ApiResponse> {
    try {
      const expenses = await this.expenseService.findByShiftId(shiftId)
      return { success: true, data: expenses }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByDateRange(_event: IpcMainInvokeEvent, startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const expenses = await this.expenseService.findByDateRange(start, end)
      return { success: true, data: expenses }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getSummaryByShift(_event: IpcMainInvokeEvent, shiftId: string): Promise<ApiResponse> {
    try {
      const summary = await this.expenseService.getExpenseSummaryByShift(shiftId)
      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getSummaryByDateRange(_event: IpcMainInvokeEvent, startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const summary = await this.expenseService.getExpenseSummaryByDateRange(start, end)
      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const expense = await this.expenseService.create(data)
      return { success: true, data: expense }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any): Promise<ApiResponse> {
    try {
      const expense = await this.expenseService.update(id, data)
      return { success: true, data: expense }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      await this.expenseService.delete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
