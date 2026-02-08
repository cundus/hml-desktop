import { getConnectivity } from './connectivity.service'
import { SyncService, SyncResult } from './sync.service'

const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * PeriodicSyncService - Runs full bidirectional sync on a schedule
 * Only syncs when online. Skips if previous sync is still running.
 */
export class PeriodicSyncService {
  private syncService: SyncService
  private syncInterval: NodeJS.Timeout | null = null
  private intervalMs: number
  private isSyncing = false
  private lastSyncResult: SyncResult | null = null
  private lastSyncTime: Date | null = null

  constructor(syncService: SyncService, intervalMs: number = DEFAULT_SYNC_INTERVAL_MS) {
    this.syncService = syncService
    this.intervalMs = intervalMs
  }

  /**
   * Start periodic sync
   */
  start(): void {
    if (this.syncInterval) {
      console.log('[PeriodicSync] Already running')
      return
    }

    console.log(`[PeriodicSync] Starting with interval ${this.intervalMs / 1000}s`)

    // Run initial sync after a short delay (give app time to initialize)
    setTimeout(() => {
      this.runSync()
    }, 10000) // 10 seconds after startup

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.runSync()
    }, this.intervalMs)

    // Also sync when coming back online
    getConnectivity().on('online', () => {
      console.log('[PeriodicSync] Online detected, triggering sync...')
      // Small delay to ensure connection is stable
      setTimeout(() => this.runSync(), 2000)
    })
  }

  /**
   * Stop periodic sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('[PeriodicSync] Stopped')
    }
  }

  /**
   * Run full sync if conditions are met
   */
  private async runSync(): Promise<void> {
    // Skip if already syncing
    if (this.isSyncing) {
      console.log('[PeriodicSync] Skipping - sync already in progress')
      return
    }

    // Skip if offline
    if (!getConnectivity().isOnline()) {
      console.log('[PeriodicSync] Skipping - offline')
      return
    }

    // Skip if cloud not connected
    if (!this.syncService.isCloudConnected()) {
      console.log('[PeriodicSync] Skipping - cloud not connected')
      return
    }

    this.isSyncing = true
    console.log('[PeriodicSync] Starting full sync...')

    try {
      const result = await this.syncService.fullSync()
      this.lastSyncResult = result
      this.lastSyncTime = new Date()

      if (result.success) {
        console.log(
          `[PeriodicSync] ✓ Complete: pulled ${result.pulled}, pushed ${result.pushed}, conflicts ${result.conflicts}`
        )
      } else {
        console.warn('[PeriodicSync] Sync completed with errors:', result.errors)
      }
    } catch (error) {
      console.error('[PeriodicSync] Sync failed:', error instanceof Error ? error.message : error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Force a sync now (manual trigger)
   */
  async syncNow(): Promise<SyncResult | null> {
    if (this.isSyncing) {
      console.log('[PeriodicSync] Sync already in progress')
      return null
    }

    await this.runSync()
    return this.lastSyncResult
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isRunning: boolean
    isSyncing: boolean
    lastSyncTime: Date | null
    lastSyncResult: SyncResult | null
    intervalMs: number
  } {
    return {
      isRunning: this.syncInterval !== null,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastSyncResult: this.lastSyncResult,
      intervalMs: this.intervalMs
    }
  }

  /**
   * Set sync interval
   */
  setInterval(ms: number): void {
    this.intervalMs = ms
    if (this.syncInterval) {
      this.stop()
      this.start()
    }
  }
}

// Singleton instance
let periodicSyncInstance: PeriodicSyncService | null = null

export function initPeriodicSync(
  syncService: SyncService,
  intervalMs?: number
): PeriodicSyncService {
  if (!periodicSyncInstance) {
    periodicSyncInstance = new PeriodicSyncService(syncService, intervalMs)
  }
  return periodicSyncInstance
}

export function getPeriodicSync(): PeriodicSyncService | null {
  return periodicSyncInstance
}
