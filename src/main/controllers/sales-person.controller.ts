import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { SalesPersonCloudService } from '../services/sales-person-cloud.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class SalesPersonController {
  constructor(
    private db: Database,
    private salesPersonService: SalesPersonCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:salesPersons:getAll', requireAuth(this.db, this.getAll.bind(this)))
    ipcMain.handle('db:salesPersons:getActive', requireAuth(this.db, this.getActive.bind(this)))
    ipcMain.handle('db:salesPersons:getById', requireAuth(this.db, this.getById.bind(this)))
    ipcMain.handle('db:salesPersons:create', requirePermission(this.db, 'master.sales-person.manage', this.create.bind(this)))
    ipcMain.handle('db:salesPersons:update', requirePermission(this.db, 'master.sales-person.manage', this.update.bind(this)))
    ipcMain.handle('db:salesPersons:delete', requirePermission(this.db, 'master.sales-person.manage', this.delete.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const data = await this.salesPersonService.findAll()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  private async getActive(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const data = await this.salesPersonService.findActive()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const data = await this.salesPersonService.findById(id)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const result = await this.salesPersonService.create(data)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any): Promise<ApiResponse> {
    try {
      const result = await this.salesPersonService.update(id, data)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const deleted = await this.salesPersonService.softDelete(id)
      return { success: true, data: deleted }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}
