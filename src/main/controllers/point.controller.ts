import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PointCloudService, PointSetting, PointHistory } from '../services/point.service'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class PointController {
  constructor(
    private db: Database,
    private pointService: PointCloudService
  ) {}

  registerHandlers(): void {
    // Settings
    ipcMain.handle('points:getSettings', requirePermission(this.db, 'settings.point.view', this.getSettings.bind(this)))
    ipcMain.handle('points:updateSettings', requirePermission(this.db, 'settings.point.manage', this.updateSettings.bind(this)))

    // Customer points
    ipcMain.handle('points:getCustomerPoints', requirePermission(this.db, 'master.customer.view', this.getCustomerPoints.bind(this)))
    ipcMain.handle('points:addPoints', requirePermission(this.db, 'sales.pos.create', this.addPoints.bind(this)))
    ipcMain.handle('points:redeemPoints', requirePermission(this.db, 'sales.pos.create', this.redeemPoints.bind(this)))

    // History
    ipcMain.handle('points:getHistory', requirePermission(this.db, 'master.customer.view', this.getHistory.bind(this)))

    // Calculations
    ipcMain.handle('points:calculateEarned', requirePermission(this.db, 'sales.pos.create', this.calculateEarned.bind(this)))
    ipcMain.handle('points:calculateRedemption', requirePermission(this.db, 'sales.pos.create', this.calculateRedemption.bind(this)))
  }

  // ==================== SETTINGS ====================

  private async getSettings(_event: IpcMainInvokeEvent): Promise<ApiResponse<PointSetting | null>> {
    try {
      const settings = await this.pointService.getSettings()
      return { success: true, data: settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings'
      }
    }
  }

  private async updateSettings(
    _event: IpcMainInvokeEvent,
    data: Partial<Omit<PointSetting, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<PointSetting>> {
    try {
      const settings = await this.pointService.updateSettings(data)
      return { success: true, data: settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }
    }
  }

  // ==================== CUSTOMER POINTS ====================

  private async getCustomerPoints(
    _event: IpcMainInvokeEvent,
    customerId: string
  ): Promise<ApiResponse<number>> {
    try {
      const points = await this.pointService.getCustomerPoints(customerId)
      return { success: true, data: points }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer points'
      }
    }
  }

  private async addPoints(
    _event: IpcMainInvokeEvent,
    input: { customerId: string; transactionId: string; transactionTotal: number }
  ): Promise<ApiResponse<PointHistory | null>> {
    try {
      const result = await this.pointService.addPoints(input)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add points'
      }
    }
  }

  private async redeemPoints(
    _event: IpcMainInvokeEvent,
    input: { customerId: string; transactionId: string; points: number }
  ): Promise<ApiResponse<{ discount: number; history: PointHistory } | null>> {
    try {
      const result = await this.pointService.redeemPoints(input)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redeem points'
      }
    }
  }

  // ==================== HISTORY ====================

  private async getHistory(
    _event: IpcMainInvokeEvent,
    customerId: string,
    limit?: number
  ): Promise<ApiResponse<PointHistory[]>> {
    try {
      const history = await this.pointService.getHistory(customerId, limit)
      return { success: true, data: history }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get history'
      }
    }
  }

  // ==================== CALCULATIONS ====================

  private async calculateEarned(
    _event: IpcMainInvokeEvent,
    transactionTotal: number
  ): Promise<ApiResponse<number>> {
    try {
      const points = await this.pointService.calculateEarnedPoints(transactionTotal)
      return { success: true, data: points }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate points'
      }
    }
  }

  private async calculateRedemption(
    _event: IpcMainInvokeEvent,
    points: number,
    transactionTotal: number
  ): Promise<ApiResponse<number>> {
    try {
      const discount = await this.pointService.calculateRedemptionDiscount(points, transactionTotal)
      return { success: true, data: discount }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate redemption'
      }
    }
  }
}
