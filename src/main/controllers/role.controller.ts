/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { RoleCloudService } from '../services/role-cloud.service'
import { ApiResponse } from '../types/response'
import { CreateRoleDto, UpdateRoleDto } from '../types/dto'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class RoleController {
  constructor(
    private db: Database,
    private roleService: RoleCloudService
  ) {}

  /**
   * Register all IPC handlers for role operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:roles:getAll', requirePermission(this.db, 'settings.role.view', this.getAll.bind(this)))
    ipcMain.handle('db:roles:create', requirePermission(this.db, 'settings.role.manage', this.create.bind(this)))
    ipcMain.handle('db:roles:update', requirePermission(this.db, 'settings.role.manage', this.update.bind(this)))
    ipcMain.handle('db:roles:softDelete', requirePermission(this.db, 'settings.role.manage', this.softDelete.bind(this)))
    ipcMain.handle('db:roles:restore', requirePermission(this.db, 'settings.role.manage', this.restore.bind(this)))
  }

  /**
   * Get all roles
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const roles = await this.roleService.findAll()
      return {
        success: true,
        data: roles
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch roles'
      }
    }
  }

  /**
   * Create new role
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateRoleDto): Promise<ApiResponse> {
    try {
      const role = await this.roleService.create(data)
      return {
        success: true,
        data: role,
        message: 'Role created successfully'
      }
    } catch (error) {
      console.error('Error creating role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create role'
      }
    }
  }

  /**
   * Update role
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateRoleDto
  ): Promise<ApiResponse> {
    try {
      const role = await this.roleService.update(id, data)
      return {
        success: true,
        data: role,
        message: 'Role updated successfully'
      }
    } catch (error) {
      console.error('Error updating role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update role'
      }
    }
  }

  /**
   * Soft delete role
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const role = await this.roleService.softDelete(id)
      return {
        success: true,
        data: role,
        message: 'Role deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete role'
      }
    }
  }

  /**
   * Restore soft-deleted role
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const role = await this.roleService.restore(id)
      return {
        success: true,
        data: role,
        message: 'Role restored successfully'
      }
    } catch (error) {
      console.error('Error restoring role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore role'
      }
    }
  }
}
