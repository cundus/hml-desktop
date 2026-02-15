import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { DamagedGoodsService } from '../services/damaged-goods.service'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class DamagedGoodsController {
  constructor(
    private db: Database,
    private damagedGoodsService: DamagedGoodsService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:damagedGoods:getAll', requirePermission(this.db, 'inventory.damaged-goods.view', this.getAll.bind(this)))
    ipcMain.handle('db:damagedGoods:getById', requirePermission(this.db, 'inventory.damaged-goods.view', this.getById.bind(this)))
    ipcMain.handle('db:damagedGoods:getByStoreId', requirePermission(this.db, 'inventory.damaged-goods.view', this.getByStoreId.bind(this)))
    ipcMain.handle('db:damagedGoods:getByDateRange', requirePermission(this.db, 'inventory.damaged-goods.view', this.getByDateRange.bind(this)))
    ipcMain.handle('db:damagedGoods:getTotalLossByDateRange', requirePermission(this.db, 'inventory.damaged-goods.view', this.getTotalLossByDateRange.bind(this)))
    ipcMain.handle('db:damagedGoods:create', requirePermission(this.db, 'inventory.damaged-goods.manage', this.create.bind(this)))
    ipcMain.handle('db:damagedGoods:delete', requirePermission(this.db, 'inventory.damaged-goods.manage', this.delete.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const items = await this.damagedGoodsService.findAll()
      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const item = await this.damagedGoodsService.findById(id)
      return { success: true, data: item }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByStoreId(_event: IpcMainInvokeEvent, storeId: string): Promise<ApiResponse> {
    try {
      const items = await this.damagedGoodsService.findByStoreId(storeId)
      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByDateRange(_event: IpcMainInvokeEvent, startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const items = await this.damagedGoodsService.findByDateRange(start, end)
      return { success: true, data: items }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getTotalLossByDateRange(_event: IpcMainInvokeEvent, startDate: string, endDate: string): Promise<ApiResponse> {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const summary = await this.damagedGoodsService.getTotalLossByDateRange(start, end)
      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any): Promise<ApiResponse> {
    try {
      const item = await this.damagedGoodsService.create(data)
      return { success: true, data: item }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      await this.damagedGoodsService.softDelete(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
