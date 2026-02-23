import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { OpenBillService, CreateOpenBillDto } from '../services/open-bill.service'

export class OpenBillController {
  constructor(private openBillService: OpenBillService) {}

  registerHandlers(): void {
    ipcMain.handle('db:openBills:create', this.create.bind(this))
    ipcMain.handle('db:openBills:getByShiftId', this.getByShiftId.bind(this))
    ipcMain.handle('db:openBills:getByStoreId', this.getByStoreId.bind(this))
    ipcMain.handle('db:openBills:getById', this.getById.bind(this))
    ipcMain.handle('db:openBills:delete', this.delete.bind(this))
    ipcMain.handle('db:openBills:deleteByShiftId', this.deleteByShiftId.bind(this))
    ipcMain.handle('db:openBills:countByShiftId', this.countByShiftId.bind(this))
  }

  private async create(_event: IpcMainInvokeEvent, data: CreateOpenBillDto) {
    try {
      const result = await this.openBillService.create(data)
      return { success: true, data: result }
    } catch (error) {
      console.error('[OpenBillController] create failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async getByShiftId(_event: IpcMainInvokeEvent, shiftId: string) {
    try {
      const result = await this.openBillService.findByShiftId(shiftId)
      return { success: true, data: result }
    } catch (error) {
      console.error('[OpenBillController] getByShiftId failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async getByStoreId(_event: IpcMainInvokeEvent, storeId: string) {
    try {
      const result = await this.openBillService.findByStoreId(storeId)
      return { success: true, data: result }
    } catch (error) {
      console.error('[OpenBillController] getByStoreId failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string) {
    try {
      const result = await this.openBillService.findById(id)
      return { success: true, data: result }
    } catch (error) {
      console.error('[OpenBillController] getById failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string) {
    try {
      await this.openBillService.delete(id)
      return { success: true }
    } catch (error) {
      console.error('[OpenBillController] delete failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async deleteByShiftId(_event: IpcMainInvokeEvent, shiftId: string) {
    try {
      await this.openBillService.deleteByShiftId(shiftId)
      return { success: true }
    } catch (error) {
      console.error('[OpenBillController] deleteByShiftId failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  private async countByShiftId(_event: IpcMainInvokeEvent, shiftId: string) {
    try {
      const count = await this.openBillService.countByShiftId(shiftId)
      return { success: true, data: count }
    } catch (error) {
      console.error('[OpenBillController] countByShiftId failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }
}
