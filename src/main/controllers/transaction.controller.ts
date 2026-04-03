import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { TransactionService } from '../services/transaction.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class TransactionController {
  constructor(
    private db: Database,
    private transactionService: TransactionService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:transactions:getAll', requirePermission(this.db, 'sales.transaction.view', this.getAll.bind(this)))
    ipcMain.handle('db:transactions:getById', requirePermission(this.db, 'sales.transaction.view', this.getById.bind(this)))
    ipcMain.handle('db:transactions:getByCode', requirePermission(this.db, 'sales.transaction.view', this.getByCode.bind(this)))
    ipcMain.handle('db:transactions:getByStoreId', requirePermission(this.db, 'sales.transaction.view', this.getByStoreId.bind(this)))
    ipcMain.handle('db:transactions:getByCustomerId', requirePermission(this.db, 'sales.transaction.view', this.getByCustomerId.bind(this)))
    ipcMain.handle('db:transactions:getByUserId', requirePermission(this.db, 'sales.transaction.view', this.getByUserId.bind(this)))
    ipcMain.handle('db:transactions:create', requireAuth(this.db, this.create.bind(this)))
    ipcMain.handle('db:transactions:update', requirePermission(this.db, 'sales.transaction.edit', this.update.bind(this)))
    ipcMain.handle('db:transactions:updateReceiptPrinted', requireAuth(this.db, this.updateReceiptPrinted.bind(this)))
    ipcMain.handle('db:transactions:getByDateRange', requirePermission(this.db, 'sales.transaction.view', this.getByDateRange.bind(this)))
    ipcMain.handle('db:transactions:getSalesSummary', requirePermission(this.db, 'sales.transaction.view', this.getSalesSummary.bind(this)))
    ipcMain.handle('db:transactions:delete', requirePermission(this.db, 'sales.transaction.delete', this.delete.bind(this)))
    ipcMain.handle('db:transactions:restore', requirePermission(this.db, 'sales.transaction.delete', this.restore.bind(this)))
    ipcMain.handle('db:transactions:getDashboardStats', requirePermission(this.db, 'dashboard.view', this.getDashboardStats.bind(this)))
    ipcMain.handle('db:transactions:getTopProducts', requirePermission(this.db, 'dashboard.view', this.getTopProducts.bind(this)))
    ipcMain.handle('db:transactions:getDashboardAlerts', requirePermission(this.db, 'dashboard.view', this.getDashboardAlerts.bind(this)))
    ipcMain.handle('db:transactions:getProfitLossReport', requirePermission(this.db, 'finance.profit-loss.view', this.getProfitLossReport.bind(this)))
    ipcMain.handle('db:transactions:getBrokenGoodsSummary', requirePermission(this.db, 'inventory.stock.view', this.getBrokenGoodsSummary.bind(this)))
    ipcMain.handle('db:transactions:getProfitDetail', requirePermission(this.db, 'sales.transaction.view-profit', this.getProfitDetail.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent) {
    try {
      const transactions = await this.transactionService.findAll()
      return { success: true, data: transactions }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getById(_event: IpcMainInvokeEvent, id: string) {
    try {
      const transaction = await this.transactionService.findById(id)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByCode(_event: IpcMainInvokeEvent, code: string) {
    try {
      const transaction = await this.transactionService.findByCode(code)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByStoreId(_event: IpcMainInvokeEvent, storeId: string) {
    try {
      const transactions = await this.transactionService.findByStoreId(storeId)
      return { success: true, data: transactions }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByCustomerId(_event: IpcMainInvokeEvent, customerId: string) {
    try {
      const transactions = await this.transactionService.findByCustomerId(customerId)
      return { success: true, data: transactions }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByUserId(_event: IpcMainInvokeEvent, userId: string) {
    try {
      const transactions = await this.transactionService.findByUserId(userId)
      return { success: true, data: transactions }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async create(_event: IpcMainInvokeEvent, data: any) {
    try {
      const transaction = await this.transactionService.create(data)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async update(_event: IpcMainInvokeEvent, id: string, data: any) {
    try {
      const transaction = await this.transactionService.update(id, data)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async updateReceiptPrinted(_event: IpcMainInvokeEvent, transactionId: string, printed: boolean) {
    try {
      const transaction = await this.transactionService.updateReceiptPrinted(transactionId, printed)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getByDateRange(_event: IpcMainInvokeEvent, startDate: string, endDate: string, storeId?: string) {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const transactions = await this.transactionService.findByDateRange(start, end, storeId)
      return { success: true, data: transactions }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getSalesSummary(_event: IpcMainInvokeEvent, storeId: string, startDate?: string, endDate?: string) {
    try {
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      const summary = await this.transactionService.getSalesSummary(storeId, start, end)
      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async delete(_event: IpcMainInvokeEvent, id: string) {
    try {
      const transaction = await this.transactionService.softDelete(id)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async restore(_event: IpcMainInvokeEvent, id: string) {
    try {
      const transaction = await this.transactionService.restore(id)
      return { success: true, data: transaction }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getDashboardStats(_event: IpcMainInvokeEvent, storeId?: string) {
    try {
      const stats = await this.transactionService.getDashboardStats(storeId)
      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getTopProducts(_event: IpcMainInvokeEvent, limit: number, storeId?: string) {
    try {
      const products = await this.transactionService.getTopProducts(limit, storeId)
      return { success: true, data: products }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getDashboardAlerts(_event: IpcMainInvokeEvent, storeId?: string) {
    try {
      const alerts = await this.transactionService.getDashboardAlerts(storeId)
      return { success: true, data: alerts }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getProfitLossReport(_event: IpcMainInvokeEvent, startDate: string, endDate: string, storeId?: string) {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const report = await this.transactionService.getProfitLossReport(start, end, storeId)
      return { success: true, data: report }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getBrokenGoodsSummary(_event: IpcMainInvokeEvent, startDate: string, endDate: string, storeId?: string) {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const summary = await this.transactionService.getBrokenGoodsSummary(start, end, storeId)
      return { success: true, data: summary }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getProfitDetail(_event: IpcMainInvokeEvent, transactionId: string) {
    try {
      const detail = await this.transactionService.getProfitDetail(transactionId)
      return { success: true, data: detail }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
