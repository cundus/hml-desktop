import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ReturnService, ReturnDto } from '../services/return.service'
import { ApiResponse } from '../types/response'

export class ReturnController {
  constructor(private returnService: ReturnService) {}

  registerHandlers(): void {
    ipcMain.handle('db:returns:create', this.createReturn.bind(this))
    ipcMain.handle('db:returns:getByTransactionId', this.getReturnsByTransactionId.bind(this))
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
}
