/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { UserRoleCloudService } from '../services/user-role-cloud.service'
import { ApiResponse } from '../types/response'

export class UserRoleController {
  constructor(private userRoleService: UserRoleCloudService) {}

  /**
   * Register all IPC handlers for user-role operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:userRoles:getAll', this.getAll.bind(this))
    ipcMain.handle('db:userRoles:getByUserId', this.getByUserId.bind(this))
    ipcMain.handle('db:userRoles:setForUser', this.setForUser.bind(this))
  }

  /**
   * Get all user-role mappings
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const mappings = await this.userRoleService.findAll()
      return {
        success: true,
        data: mappings
      }
    } catch (error) {
      console.error('Error fetching user roles:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user roles'
      }
    }
  }

  /**
   * Get roles for a specific user
   */
  private async getByUserId(_event: IpcMainInvokeEvent, userId: string): Promise<ApiResponse> {
    try {
      const mappings = await this.userRoleService.findByUserId(userId)
      return {
        success: true,
        data: mappings
      }
    } catch (error) {
      console.error('Error fetching user roles for user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user roles for user'
      }
    }
  }

  /**
   * Replace roles for a user
   */
  private async setForUser(
    _event: IpcMainInvokeEvent,
    userId: string,
    roleIds: string[]
  ): Promise<ApiResponse> {
    try {
      const mappings = await this.userRoleService.setRolesForUser(userId, roleIds)
      return {
        success: true,
        data: mappings
      }
    } catch (error) {
      console.error('Error setting roles for user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set roles for user'
      }
    }
  }
}
