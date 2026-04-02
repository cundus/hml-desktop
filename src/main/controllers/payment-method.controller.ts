import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PaymentMethodCloudService } from '../services/payment-method-cloud.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class PaymentMethodController {
  constructor(
    private db: Database,
    private paymentMethodService: PaymentMethodCloudService
  ) {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('paymentMethods:getAll', requireAuth(this.db, this.getAll.bind(this)))
    ipcMain.handle('paymentMethods:getActive', requireAuth(this.db, this.getActive.bind(this)))
    ipcMain.handle('paymentMethods:getById', requireAuth(this.db, this.getById.bind(this)))
    ipcMain.handle('paymentMethods:create', requirePermission(this.db, 'master.payment-method.manage', this.create.bind(this)))
    ipcMain.handle('paymentMethods:update', requirePermission(this.db, 'master.payment-method.manage', this.update.bind(this)))
    ipcMain.handle('paymentMethods:delete', requirePermission(this.db, 'master.payment-method.manage', this.delete.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const data = await this.paymentMethodService.findAll()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getActive(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const data = await this.paymentMethodService.findActive()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const data = await this.paymentMethodService.findById(id)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const created = await this.paymentMethodService.create(data)
      return { success: true, data: created }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any): Promise<ApiResponse> {
    try {
      const updated = await this.paymentMethodService.update(id, data)
      return { success: true, data: updated }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const deleted = await this.paymentMethodService.softDelete(id)
      return { success: true, data: deleted }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
