/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { RolePermissionCloudService } from '../services/role-permission-cloud.service'
import { ApiResponse } from '../types/response'

export class RolePermissionController {
  constructor(private rolePermissionService: RolePermissionCloudService) {}

  registerHandlers(): void {
    ipcMain.handle('db:rolePermissions:getAll', this.getAll.bind(this))
    ipcMain.handle('db:rolePermissions:getByRoleId', this.getByRoleId.bind(this))
    ipcMain.handle('db:rolePermissions:setForRole', this.setForRole.bind(this))
  }

  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const mappings = await this.rolePermissionService.findAll()
      return { success: true, data: mappings }
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role permissions'
      }
    }
  }

  private async getByRoleId(_event: IpcMainInvokeEvent, roleId: string): Promise<ApiResponse> {
    try {
      const mappings = await this.rolePermissionService.findByRoleId(roleId)
      return { success: true, data: mappings }
    } catch (error) {
      console.error('Error fetching role permissions for role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role permissions for role'
      }
    }
  }

  private async setForRole(
    _event: IpcMainInvokeEvent,
    roleId: string,
    permissionIds: string[]
  ): Promise<ApiResponse> {
    try {
      const mappings = await this.rolePermissionService.setPermissionsForRole(roleId, permissionIds)
      return { success: true, data: mappings }
    } catch (error) {
      console.error('Error setting permissions for role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set permissions for role'
      }
    }
  }
}
