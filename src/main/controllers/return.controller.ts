import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ReturnService, ReturnDto } from '../services/return.service'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class ReturnController {
  constructor(
    private db: Database,
    private returnService: ReturnService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:returns:create', requirePermission(this.db, 'sales.return.create', this.createReturn.bind(this)))
    ipcMain.handle('db:returns:getByTransactionId', requirePermission(this.db, 'sales.return.view', this.getReturnsByTransactionId.bind(this)))
    ipcMain.handle('db:returns:getSummaryByDateRange', requirePermission(this.db, 'sales.return.view', this.getSummaryByDateRange.bind(this)))
  }

  private async createReturn(_event: IpcMainInvokeEvent, data: ReturnDto): Promise<ApiResponse> {
    try {
      const result = await this.returnService.createReturn(data)
      return { success: true, data: result }
    } catch (error) {
      console.error('[ReturnController] createReturn error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getReturnsByTransactionId(
    _event: IpcMainInvokeEvent,
    transactionId: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.returnService.getReturnsByTransactionId(transactionId)
      return { success: true, data: result }
    } catch (error) {
      console.error('[ReturnController] getReturnsByTransactionId error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getSummaryByDateRange(
    _event: IpcMainInvokeEvent,
    startDate: string,
    endDate: string,
    storeId?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.returnService.getReturnSummaryByDateRange(startDate, endDate, storeId)
      return { success: true, data: result }
    } catch (error) {
      console.error('[ReturnController] getSummaryByDateRange error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
