import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { SalesPersonService } from '../services/sales-person.service'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class SalesPersonController {
  constructor(
    private db: Database,
    private salesPersonService: SalesPersonService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:salesPersons:getAll', requirePermission(this.db, 'master.sales-person.view', this.getAll.bind(this)))
    ipcMain.handle('db:salesPersons:getActive', requirePermission(this.db, 'master.sales-person.view', this.getActive.bind(this)))
    ipcMain.handle('db:salesPersons:getById', requirePermission(this.db, 'master.sales-person.view', this.getById.bind(this)))
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
      const success = await this.salesPersonService.softDelete(id)
      return { success, data: success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
}
