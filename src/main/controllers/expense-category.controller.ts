import { ipcMain, IpcMainInvokeEvent } from 'electron'
import type { Database } from 'sql.js'
import { ExpenseCategoryCloudService, CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from '../services/expense-category-cloud.service'
import { QueueService } from '../services/queue.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class ExpenseCategoryController {
  private service: ExpenseCategoryCloudService

  constructor(private localDb: Database, queueService: QueueService) {
    this.service = new ExpenseCategoryCloudService(localDb, queueService)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('db:expenseCategories:getAll', requireAuth(this.localDb, this.getAll.bind(this)))
    ipcMain.handle('db:expenseCategories:getByType', requireAuth(this.localDb, this.getByType.bind(this)))
    ipcMain.handle('db:expenseCategories:findById', requireAuth(this.localDb, this.findById.bind(this)))
    ipcMain.handle('db:expenseCategories:create', requirePermission(this.localDb, 'master.expense-category.create', this.create.bind(this)))
    ipcMain.handle('db:expenseCategories:update', requirePermission(this.localDb, 'master.expense-category.edit', this.update.bind(this)))
    ipcMain.handle('db:expenseCategories:delete', requirePermission(this.localDb, 'master.expense-category.delete', this.delete.bind(this)))
  }

  private async getAll(): Promise<ApiResponse> {
    try {
      const result = await this.service.getAll()
      return { success: true, data: result }
    } catch (error) {
      console.error('Error getting expense categories:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByType(_event: IpcMainInvokeEvent, type: 'shift' | 'operational'): Promise<ApiResponse> {
    try {
      const result = await this.service.getByType(type)
      return { success: true, data: result }
    } catch (error) {
      console.error('Error getting expense categories by type:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async findById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const result = await this.service.findById(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('Error finding expense category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: CreateExpenseCategoryDto): Promise<ApiResponse> {
    try {
      const result = await this.service.create(data)
      return { success: true, data: result }
    } catch (error) {
      console.error('Error creating expense category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: UpdateExpenseCategoryDto): Promise<ApiResponse> {
    try {
      const result = await this.service.update(id, data)
      return { success: true, data: result }
    } catch (error) {
      console.error('Error updating expense category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const result = await this.service.delete(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('Error deleting expense category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
