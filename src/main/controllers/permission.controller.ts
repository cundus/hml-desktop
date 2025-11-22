/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PermissionService } from '../services/permission.service'
import { ApiResponse } from '../types/response'

export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  registerHandlers(): void {
    ipcMain.handle('db:permissions:getAll', this.getAll.bind(this))
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
