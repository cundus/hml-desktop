/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { SyncService, SyncResult, SyncStatus } from '../services/sync.service'
import { ApiResponse } from '../types/response'

export class SyncController {
  private syncService: SyncService

  constructor(syncService: SyncService) {
    this.syncService = syncService
  }

  /**
   * Register all sync-related IPC handlers
   */
  registerHandlers(): void {
    ipcMain.handle('sync:connect', this.connectToCloud.bind(this))
    ipcMain.handle('sync:disconnect', this.disconnect.bind(this))
    ipcMain.handle('sync:full', this.fullSync.bind(this))
    ipcMain.handle('sync:pull', this.pullFromCloud.bind(this))
    ipcMain.handle('sync:push', this.pushToCloud.bind(this))
    ipcMain.handle('sync:initial', this.initialSync.bind(this))
    ipcMain.handle('sync:status', this.getStatus.bind(this))
  }

  /**
   * Connect to cloud database
   */
  private async connectToCloud(
    _event: IpcMainInvokeEvent,
    cloudDatabaseUrl: string
  ): Promise<ApiResponse<boolean>> {
    try {
      await this.syncService.initCloudConnection(cloudDatabaseUrl)
      return {
        success: true,
        data: true,
        message: 'Connected to cloud database'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to cloud'
      }
    }
  }

  /**
   * Disconnect from cloud
   */
  private async disconnect(_event: IpcMainInvokeEvent): Promise<ApiResponse<boolean>> {
    try {
      await this.syncService.disconnect()
      return {
        success: true,
        data: true,
        message: 'Disconnected from cloud'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect'
      }
    }
  }

  /**
   * Perform full sync (pull + push)
   */
  private async fullSync(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      const result = await this.syncService.fullSync()
      return {
        success: result.success,
        data: result,
        message: `Sync completed: ${result.pulled} pulled, ${result.pushed} pushed, ${result.conflicts} conflicts`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }

  /**
   * Pull data from cloud
   */
  private async pullFromCloud(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      const pullResult = await this.syncService.pullFromCloud()
      const result: SyncResult = {
        success: true,
        pulled: pullResult.count,
        pushed: 0,
        conflicts: pullResult.conflicts,
        errors: [],
        timestamp: new Date()
      }
      return {
        success: true,
        data: result,
        message: `Pulled ${pullResult.count} records from cloud`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pull failed'
      }
    }
  }

  /**
   * Push data to cloud
   */
  private async pushToCloud(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      const pushResult = await this.syncService.pushToCloud()
      const result: SyncResult = {
        success: true,
        pulled: 0,
        pushed: pushResult.count,
        conflicts: pushResult.conflicts,
        errors: [],
        timestamp: new Date()
      }
      return {
        success: true,
        data: result,
        message: `Pushed ${pushResult.count} records to cloud`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push failed'
      }
    }
  }

  /**
   * Initial sync on first launch
   */
  private async initialSync(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      const result = await this.syncService.initialSync()
      return {
        success: result.success,
        data: result,
        message: `Initial sync completed: ${result.pulled} records pulled`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initial sync failed'
      }
    }
  }

  /**
   * Get sync status
   */
  private async getStatus(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncStatus>> {
    try {
      const status = await this.syncService.getSyncStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      }
    }
  }
}
