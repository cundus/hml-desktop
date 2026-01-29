import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { getCloudDb } from '../services/cloud-db.service'
import { getConnectivity } from '../services/connectivity.service'
import { QueueProcessorService } from '../services/queue-processor.service'
import { AppConfigService } from '../services/app-config.service'
import { ApiResponse } from '../types/response'

interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: string | null
  unsyncedRecordsCount: number
  deviceId: string
}

interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: Date
  byEntity?: Record<string, { pulled: number; pushed: number }>
}

/**
 * CloudController - Handles cloud connection and sync-related IPC requests
 * Replaces old SyncController with cloud-first pattern
 */
export class CloudController {
  constructor(
    private queueProcessor: QueueProcessorService,
    private appConfigService?: AppConfigService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('sync:connect', this.connectToCloud.bind(this))
    ipcMain.handle('sync:disconnect', this.disconnect.bind(this))
    ipcMain.handle('sync:full', this.processQueue.bind(this))
    ipcMain.handle('sync:pull', this.pullFromCloud.bind(this))
    ipcMain.handle('sync:push', this.processQueue.bind(this))
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
      const cloudDb = getCloudDb()
      await cloudDb.connect(cloudDatabaseUrl)

      // Start connectivity monitoring and queue processor
      getConnectivity().startMonitoring()
      this.queueProcessor.start()

      // Save cloudDbUrl to app config for persistence across app restarts/updates
      if (this.appConfigService) {
        await this.appConfigService.setCloudDbUrl(cloudDatabaseUrl)
        console.log('[CloudController] Saved cloud database URL to configuration')
      }

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
      const cloudDb = getCloudDb()
      await cloudDb.disconnect()
      this.queueProcessor.stop()

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
   * Process queue (replaces old push/full sync)
   */
  private async processQueue(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      await this.queueProcessor.processQueue()
      const stats = this.queueProcessor.getStats()

      const result: SyncResult = {
        success: true,
        pulled: 0,
        pushed: stats.pending === 0 ? 1 : 0, // Indicate success if queue is empty
        conflicts: 0,
        errors: [],
        timestamp: new Date()
      }

      return {
        success: true,
        data: result,
        message: 'Queue processing completed'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Queue processing failed'
      }
    }
  }

  /**
   * Pull from cloud (not applicable in cloud-first, returns empty result)
   */
  private async pullFromCloud(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    // In cloud-first architecture, data is read directly from cloud
    // Pull is not needed as a manual operation
    const result: SyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date()
    }

    return {
      success: true,
      data: result,
      message: 'Cloud-first mode: Data is read directly from cloud'
    }
  }

  /**
   * Initial sync (process any pending queue items)
   */
  private async initialSync(_event: IpcMainInvokeEvent): Promise<ApiResponse<SyncResult>> {
    try {
      await this.queueProcessor.processQueue()

      const result: SyncResult = {
        success: true,
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        errors: [],
        timestamp: new Date()
      }

      return {
        success: true,
        data: result,
        message: 'Initial sync completed'
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
      const cloudDb = getCloudDb()
      const stats = this.queueProcessor.getStats()

      const status: SyncStatus = {
        isCloudConnected: cloudDb.isConnected(),
        lastSyncTime: null, // Could track this if needed
        unsyncedRecordsCount: stats.pending + stats.failed,
        deviceId: 'local' // Could get from app config
      }

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
