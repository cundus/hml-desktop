/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PermissionCloudService } from '../services/permission-cloud.service'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class PermissionController {
  constructor(
    private db: Database,
    private permissionService: PermissionCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:permissions:getAll', requirePermission(this.db, 'settings.role.view', this.getAll.bind(this)))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const permissions = await this.permissionService.findAll()
      return { success: true, data: permissions }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions'
      }
    }
  }
}
