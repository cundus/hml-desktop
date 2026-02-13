import { getConnectivity } from './connectivity.service'
import { SyncService, SyncResult, SyncType } from './sync.service'

const BACKGROUND_SYNC_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const CRITICAL_SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000 // Check every minute

/**
 * PeriodicSyncService - Runs sync on a schedule with prioritization
 * - Critical sync: High priority entities (users, products, etc.) - every 5 mins
 * - Background sync: All entities (transactions, history, etc.) - every 1 hour
 */
export class PeriodicSyncService {
  private syncService: SyncService
  private checkInterval: NodeJS.Timeout | null = null
  private isSyncing = false
  
  private lastSyncResult: SyncResult | null = null
  private lastCriticalSyncTime: number = 0
  private lastBackgroundSyncTime: number = 0

  constructor(syncService: SyncService) {
    this.syncService = syncService
  }

  /**
   * Start periodic sync scheduler
   */
  start(): void {
    if (this.checkInterval) {
      console.log('[PeriodicSync] Already running')
      return
    }

    console.log('[PeriodicSync] Starting scheduler')
    console.log(`[PeriodicSync] Critical sync interval: ${CRITICAL_SYNC_INTERVAL_MS / 1000}s`)
    console.log(`[PeriodicSync] Background sync interval: ${BACKGROUND_SYNC_INTERVAL_MS / 1000}s`)

    // Run initial critical sync after a short delay
    setTimeout(() => {
      this.runSync('critical')
    }, 10000)

    // Check schedule every minute
    this.checkInterval = setInterval(() => {
      this.checkAndRunSync()
    }, CHECK_INTERVAL_MS)

    // Also sync critical when coming back online
    getConnectivity().on('online', () => {
      console.log('[PeriodicSync] Online detected, triggering critical sync...')
      setTimeout(() => this.runSync('critical'), 2000)
    })
  }

  /**
   * Stop periodic sync
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[PeriodicSync] Stopped')
    }
  }

  /**
   * Check if sync is needed based on elapsed time
   */
  private checkAndRunSync(): void {
    const now = Date.now()
    
    // Check background sync first (covers all)
    if (now - this.lastBackgroundSyncTime >= BACKGROUND_SYNC_INTERVAL_MS) {
      console.log('[PeriodicSync] Triggering background sync (all entities)...')
      this.runSync('all')
      return
    }

    // Check critical sync
    if (now - this.lastCriticalSyncTime >= CRITICAL_SYNC_INTERVAL_MS) {
      console.log('[PeriodicSync] Triggering critical sync...')
      this.runSync('critical')
      return
    }
  }

  /**
   * Run sync with specified type
   */
  private async runSync(type: SyncType): Promise<void> {
    // Skip if already syncing
    if (this.isSyncing) {
      console.log(`[PeriodicSync] Skipping ${type} sync - sync already in progress`)
      return
    }

    // Skip if offline
    if (!getConnectivity().isOnline()) {
      return
    }

    // Skip if cloud not connected
    if (!this.syncService.isCloudConnected()) {
      return
    }

    this.isSyncing = true
    const startTime = Date.now()
    console.log(`[PeriodicSync] Starting ${type} sync...`)

    try {
      const result = await this.syncService.fullSync(type)
      this.lastSyncResult = result
      
      const now = Date.now()
      this.lastCriticalSyncTime = now
      
      // If 'all' type was run, it also counts as background sync
      if (type === 'all') {
        this.lastBackgroundSyncTime = now
      }

      if (result.success) {
        const duration = (Date.now() - startTime) / 1000
        console.log(
          `[PeriodicSync] ✓ ${type} sync complete in ${duration}s: pulled ${result.pulled}, pushed ${result.pushed}, conflicts ${result.conflicts}`
        )
      } else {
        console.warn(`[PeriodicSync] ${type} sync completed with errors:`, result.errors)
      }
    } catch (error) {
      console.error(`[PeriodicSync] ${type} sync failed:`, error instanceof Error ? error.message : error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Force a sync now (manual trigger)
   * Defaults to 'all' for manual triggers
   */
  async syncNow(type: SyncType = 'all'): Promise<SyncResult | null> {
    if (this.isSyncing) {
      console.log('[PeriodicSync] Sync already in progress')
      return null
    }

    await this.runSync(type)
    return this.lastSyncResult
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isRunning: boolean
    isSyncing: boolean
    lastCriticalSyncTime: Date | null
    lastBackgroundSyncTime: Date | null
    lastSyncResult: SyncResult | null
  } {
    return {
      isRunning: this.checkInterval !== null,
      isSyncing: this.isSyncing,
      lastCriticalSyncTime: this.lastCriticalSyncTime > 0 ? new Date(this.lastCriticalSyncTime) : null,
      lastBackgroundSyncTime: this.lastBackgroundSyncTime > 0 ? new Date(this.lastBackgroundSyncTime) : null,
      lastSyncResult: this.lastSyncResult
    }
  }
}

// Singleton instance
let periodicSyncInstance: PeriodicSyncService | null = null

export function initPeriodicSync(
  syncService: SyncService,
  _intervalMs?: number // Deprecated, kept for compatibility
): PeriodicSyncService {
  if (!periodicSyncInstance) {
    periodicSyncInstance = new PeriodicSyncService(syncService)
  }
  return periodicSyncInstance
}

export function getPeriodicSync(): PeriodicSyncService | null {
  return periodicSyncInstance
}
