import { EventEmitter } from 'events'
import { getCloudDb } from './cloud-db.service'

export type ConnectivityStatus = 'online' | 'offline' | 'checking'

/**
 * ConnectivityService - Monitors cloud database connectivity
 * Emits events for status changes, triggers queue processing when online
 */
export class ConnectivityService extends EventEmitter {
  private static instance: ConnectivityService | null = null
  private status: ConnectivityStatus = 'offline'
  private checkInterval: NodeJS.Timeout | null = null
  private checkIntervalMs = 5000 // Check every 5 seconds

  private constructor() {
    super()
  }

  static getInstance(): ConnectivityService {
    if (!ConnectivityService.instance) {
      ConnectivityService.instance = new ConnectivityService()
    }
    return ConnectivityService.instance
  }

  /**
   * Start monitoring connectivity
   */
  startMonitoring(): void {
    if (this.checkInterval) return

    console.log('[Connectivity] Starting monitoring...')
    this.checkNow()

    this.checkInterval = setInterval(() => {
      this.checkNow()
    }, this.checkIntervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[Connectivity] Stopped monitoring')
    }
  }

  /**
   * Check connectivity now
   */
  async checkNow(): Promise<ConnectivityStatus> {
    const previousStatus = this.status
    const wasChecking = previousStatus === 'checking'

    try {
      const cloudDb = getCloudDb()

      if (!cloudDb.isConnected()) {
        // Try to connect
        await cloudDb.connect()
      }

      const isOnline = await cloudDb.ping()
      this.status = isOnline ? 'online' : 'offline'
    } catch {
      this.status = 'offline'
    }

    // Emit event if status changed (and wasn't just transitioning from checking)
    if (!wasChecking && previousStatus !== this.status) {
      console.log(`[Connectivity] Status changed: ${previousStatus} -> ${this.status}`)
      this.emit('statusChange', this.status)

      if (this.status === 'online') {
        this.emit('online')
      } else {
        this.emit('offline')
      }
    }

    return this.status
  }

  /**
   * Get current status
   */
  getStatus(): ConnectivityStatus {
    return this.status
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status === 'online'
  }

  /**
   * Set check interval (in milliseconds)
   */
  setCheckInterval(ms: number): void {
    this.checkIntervalMs = ms
    if (this.checkInterval) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }
}

// Export singleton getter
export function getConnectivity(): ConnectivityService {
  return ConnectivityService.getInstance()
}
