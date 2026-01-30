import { ipcMain, IpcMainInvokeEvent } from 'electron'
import {
  AuditLogService,
  AuditLogFilters,
  AuditAction,
  AuditEntityType
} from '../services/audit-log.service'
import { ApiResponse } from '../types/response'

/**
 * AuditLogController - Handles IPC requests for audit log operations
 */
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * Register all IPC handlers for audit log operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:audit:getAll', this.getAll.bind(this))
    ipcMain.handle('db:audit:getCount', this.getCount.bind(this))
    ipcMain.handle('db:audit:cleanup', this.cleanup.bind(this))
  }

  /**
   * Get all audit logs with filters
   */
  private async getAll(
    _event: IpcMainInvokeEvent,
    filters: {
      startDate?: string
      endDate?: string
      action?: AuditAction
      entityType?: AuditEntityType
      userId?: string
      storeId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<ApiResponse> {
    try {
      const parsedFilters: AuditLogFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined
      }

      const logs = await this.auditLogService.getAll(parsedFilters)

      return {
        success: true,
        data: logs
      }
    } catch (error) {
      console.error('[AuditLogController] getAll error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit logs'
      }
    }
  }

  /**
   * Get total count of audit logs matching filters
   */
  private async getCount(
    _event: IpcMainInvokeEvent,
    filters: {
      startDate?: string
      endDate?: string
      action?: AuditAction
      entityType?: AuditEntityType
      userId?: string
      storeId?: string
    } = {}
  ): Promise<ApiResponse> {
    try {
      const parsedFilters: AuditLogFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined
      }

      const count = await this.auditLogService.getCount(parsedFilters)

      return {
        success: true,
        data: count
      }
    } catch (error) {
      console.error('[AuditLogController] getCount error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get audit log count'
      }
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   * This should only be called by admin users
   */
  private async cleanup(
    _event: IpcMainInvokeEvent,
    retentionDays: number = 365
  ): Promise<ApiResponse> {
    try {
      if (retentionDays < 30) {
        return {
          success: false,
          error: 'Retention period must be at least 30 days'
        }
      }

      const deletedCount = await this.auditLogService.cleanup(retentionDays)

      return {
        success: true,
        data: deletedCount,
        message: `Deleted ${deletedCount} audit log entries older than ${retentionDays} days`
      }
    } catch (error) {
      console.error('[AuditLogController] cleanup error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup audit logs'
      }
    }
  }
}
