/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { StoreCloudService } from '../services/store-cloud.service'
import { CreateStoreDto, UpdateStoreDto } from '../types/dto'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class StoreController {
  constructor(
    private db: Database,
    private storeService: StoreCloudService
  ) {}

  /**
   * Register all IPC handlers for store operations
   */
  registerHandlers(): void {
    ipcMain.handle(
      'db:stores:getAll',
      requirePermission(this.db, 'master.store.view', this.getAll.bind(this), {
        allowDuringSetup: true
      })
    )
    ipcMain.handle('db:stores:getById', requirePermission(this.db, 'master.store.view', this.getById.bind(this), { allowDuringSetup: true }))
    ipcMain.handle('db:stores:getByCode', requirePermission(this.db, 'master.store.view', this.getByCode.bind(this), { allowDuringSetup: true }))
    ipcMain.handle('db:stores:create', requirePermission(this.db, 'master.store.create', this.create.bind(this), { allowDuringSetup: true }))
    ipcMain.handle('db:stores:update', requirePermission(this.db, 'master.store.edit', this.update.bind(this), { allowDuringSetup: true }))
    ipcMain.handle('db:stores:softDelete', requirePermission(this.db, 'master.store.delete', this.softDelete.bind(this), { allowDuringSetup: true }))
    ipcMain.handle('db:stores:restore', requirePermission(this.db, 'master.store.delete', this.restore.bind(this), { allowDuringSetup: true }))
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
