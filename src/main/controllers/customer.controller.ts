import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { CustomerCloudService } from '../services/customer-cloud.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class CustomerController {
  constructor(
    private db: Database,
    private customerService: CustomerCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:customers:getAll', requireAuth(this.db, this.getAll.bind(this)))
    ipcMain.handle('db:customers:getById', requireAuth(this.db, this.getById.bind(this)))
    ipcMain.handle('db:customers:search', requireAuth(this.db, this.search.bind(this)))
    ipcMain.handle('db:customers:getByCategory', requireAuth(this.db, this.getByCategory.bind(this)))
    ipcMain.handle('db:customers:create', requirePermission(this.db, 'master.customer.create', this.create.bind(this)))
    ipcMain.handle('db:customers:update', requirePermission(this.db, 'master.customer.edit', this.update.bind(this)))
    ipcMain.handle('db:customers:delete', requirePermission(this.db, 'master.customer.delete', this.delete.bind(this)))
    ipcMain.handle('db:customers:restore', requirePermission(this.db, 'master.customer.delete', this.restore.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const customers = await this.customerService.findAll()
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const customer = await this.customerService.findById(id)
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async search(_event: IpcMainInvokeEvent, query: string): Promise<ApiResponse> {
    try {
      const customers = await this.customerService.search(query)
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByCategory(_event: IpcMainInvokeEvent, categoryId: string): Promise<ApiResponse> {
    try {
      const customers = await this.customerService.findByCategory(categoryId)
      return { success: true, data: customers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const customer = await this.customerService.create(data)
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any): Promise<ApiResponse> {
    try {
      const customer = await this.customerService.update(id, data)
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const customer = await this.customerService.softDelete(id)
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const customer = await this.customerService.restore(id)
      return { success: true, data: customer }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
