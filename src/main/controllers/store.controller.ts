/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { StoreService } from '../services/store.service'
import { CreateStoreDto, UpdateStoreDto } from '../types/dto'
import { ApiResponse } from '../types/response'

export class StoreController {
  constructor(private storeService: StoreService) {}

  /**
   * Register all IPC handlers for store operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:stores:getAll', this.getAll.bind(this))
    ipcMain.handle('db:stores:getById', this.getById.bind(this))
    ipcMain.handle('db:stores:getByCode', this.getByCode.bind(this))
    ipcMain.handle('db:stores:create', this.create.bind(this))
    ipcMain.handle('db:stores:update', this.update.bind(this))
    ipcMain.handle('db:stores:softDelete', this.softDelete.bind(this))
    ipcMain.handle('db:stores:restore', this.restore.bind(this))
  }

  /**
   * Get all stores
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const stores = await this.storeService.findAll()
      return {
        success: true,
        data: stores
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stores'
      }
    }
  }

  /**
   * Get store by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const store = await this.storeService.findById(id)
      if (!store) {
        return {
          success: false,
          error: 'Store not found'
        }
      }
      return {
        success: true,
        data: store
      }
    } catch (error) {
      console.error('Error fetching store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch store'
      }
    }
  }

  /**
   * Get store by code
   */
  private async getByCode(_event: IpcMainInvokeEvent, code: string): Promise<ApiResponse> {
    try {
      const store = await this.storeService.findByCode(code)
      if (!store) {
        return {
          success: false,
          error: 'Store not found'
        }
      }
      return {
        success: true,
        data: store
      }
    } catch (error) {
      console.error('Error fetching store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch store'
      }
    }
  }

  /**
   * Create new store
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateStoreDto): Promise<ApiResponse> {
    try {
      const store = await this.storeService.create(data)
      return {
        success: true,
        data: store,
        message: 'Store created successfully'
      }
    } catch (error) {
      console.error('Error creating store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create store'
      }
    }
  }

  /**
   * Update store
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateStoreDto
  ): Promise<ApiResponse> {
    try {
      const store = await this.storeService.update(id, data)
      return {
        success: true,
        data: store,
        message: 'Store updated successfully'
      }
    } catch (error) {
      console.error('Error updating store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update store'
      }
    }
  }

  /**
   * Soft delete store
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const store = await this.storeService.softDelete(id)
      return {
        success: true,
        data: store,
        message: 'Store deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete store'
      }
    }
  }

  /**
   * Restore soft-deleted store
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const store = await this.storeService.restore(id)
      return {
        success: true,
        data: store,
        message: 'Store restored successfully'
      }
    } catch (error) {
      console.error('Error restoring store:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore store'
      }
    }
  }
}
