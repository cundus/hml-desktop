import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { UserService } from '../services/user.service'
import { CreateUserDto, UpdateUserDto } from '../types/dto'
import { ApiResponse } from '../types/response'

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Register all IPC handlers for user operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:users:getAll', this.getAll.bind(this))
    ipcMain.handle('db:users:getById', this.getById.bind(this))
    ipcMain.handle('db:users:create', this.create.bind(this))
    ipcMain.handle('db:users:update', this.update.bind(this))
    ipcMain.handle('db:users:softDelete', this.softDelete.bind(this))
    ipcMain.handle('db:users:restore', this.restore.bind(this))
  }

  /**
   * Get all users
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const users = await this.userService.findAll()
      return {
        success: true,
        data: users
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      }
    }
  }

  /**
   * Get user by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const user = await this.userService.findById(id)
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }
      return {
        success: true,
        data: user
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user'
      }
    }
  }

  /**
   * Create new user
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateUserDto): Promise<ApiResponse> {
    try {
      // Check if email already exists
      const existing = await this.userService.findByEmail(data.email)
      if (existing) {
        return {
          success: false,
          error: 'Email already exists'
        }
      }

      const user = await this.userService.create(data)
      return {
        success: true,
        data: user,
        message: 'User created successfully'
      }
    } catch (error) {
      console.error('Error creating user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      }
    }
  }

  /**
   * Update user
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateUserDto
  ): Promise<ApiResponse> {
    try {
      // Check if user exists
      const existing = await this.userService.findById(id)
      if (!existing) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Check if email is being changed and already exists
      if (data.email && data.email !== existing.email) {
        const emailExists = await this.userService.findByEmail(data.email)
        if (emailExists) {
          return {
            success: false,
            error: 'Email already exists'
          }
        }
      }

      const user = await this.userService.update(id, data)
      return {
        success: true,
        data: user,
        message: 'User updated successfully'
      }
    } catch (error) {
      console.error('Error updating user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      }
    }
  }

  /**
   * Soft delete user
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const user = await this.userService.softDelete(id)
      return {
        success: true,
        data: user,
        message: 'User deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user'
      }
    }
  }

  /**
   * Restore soft-deleted user
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const user = await this.userService.restore(id)
      return {
        success: true,
        data: user,
        message: 'User restored successfully'
      }
    } catch (error) {
      console.error('Error restoring user:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore user'
      }
    }
  }
}
