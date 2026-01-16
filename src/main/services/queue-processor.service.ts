import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService, QueueItem } from './queue.service'

const MAX_RETRIES = 5
const PROCESS_INTERVAL_MS = 5000
const BASE_RETRY_DELAY_MS = 1000 // 1s, 2s, 4s, 8s, 16s

/**
 * QueueProcessorService - Background worker to process queued operations
 * Replays pending operations to cloud when online
 */
export class QueueProcessorService {
  private queueService: QueueService
  private processInterval: NodeJS.Timeout | null = null
  private isProcessing = false

  constructor(queueService: QueueService) {
    this.queueService = queueService
  }

  /**
   * Start processing queue in background
   */
  start(): void {
    if (this.processInterval) return

    const connectivity = getConnectivity()

    // Process immediately when coming online
    connectivity.on('online', () => {
      console.log('[QueueProcessor] Online detected, processing queue...')
      this.processQueue()
    })

    // Start interval processing
    this.processInterval = setInterval(() => {
      if (connectivity.isOnline()) {
        this.processQueue()
      }
    }, PROCESS_INTERVAL_MS)

    console.log('[QueueProcessor] Started')
  }

  /**
   * Stop processing
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
      console.log('[QueueProcessor] Stopped')
    }
  }

  /**
   * Process all pending queue items
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return
    if (!getConnectivity().isOnline()) return

    this.isProcessing = true
    const pending = this.queueService.getPending()

    if (pending.length === 0) {
      this.isProcessing = false
      return
    }

    console.log(`[QueueProcessor] Processing ${pending.length} items...`)

    for (const item of pending) {
      try {
        // Apply exponential backoff delay based on retry count
        if (item.retryCount > 0) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, item.retryCount - 1)
          console.log(`[QueueProcessor] Waiting ${delay}ms before retry ${item.retryCount}...`)
          await this.sleep(delay)
        }

        this.queueService.markProcessing(item.id)
        await this.executeItem(item)
        this.queueService.markComplete(item.id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)

        if (item.retryCount >= MAX_RETRIES - 1) {
          this.queueService.markFailed(item.id, errorMsg)
          console.error(`[QueueProcessor] Max retries exceeded for ${item.id}`)
        } else {
          this.queueService.markRetry(item.id, errorMsg)
        }
      }
    }

    this.isProcessing = false
    console.log('[QueueProcessor] Processing complete')
  }

  /**
   * Get processing statistics
   */
  getStats(): { pending: number; failed: number; isProcessing: boolean; isOnline: boolean } {
    return {
      pending: this.queueService.getPendingCount(),
      failed: this.queueService.getFailedCount(),
      isProcessing: this.isProcessing,
      isOnline: getConnectivity().isOnline()
    }
  }

  /**
   * Sleep utility for exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Execute a single queue item on cloud
   */
  private async executeItem(item: QueueItem): Promise<void> {
    const cloudDb = getCloudDb()
    const pool = cloudDb.getPool()
    const payload = this.queueService.parsePayload(item)
    const entity = item.entity

    switch (item.action) {
      case 'INSERT':
        await this.executeInsert(pool, entity, payload)
        break
      case 'UPDATE':
        await this.executeUpdate(pool, entity, payload)
        break
      case 'DELETE':
        await this.executeDelete(pool, entity, payload)
        break
      default:
        throw new Error(`Unknown action: ${item.action}`)
    }
  }

  /**
   * Execute INSERT on cloud
   */
  private async executeInsert(
    pool: ReturnType<typeof getCloudDb.prototype.getPool>,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const columns = Object.keys(payload)
    const values = Object.values(payload)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const tableName = this.quoteTable(entity)

    await pool.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${columns.map((c, i) => `${c} = $${i + 1}`).join(', ')}`,
      values
    )
  }

  /**
   * Execute UPDATE on cloud
   */
  private async executeUpdate(
    pool: ReturnType<typeof getCloudDb.prototype.getPool>,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const id = payload.id
    const columns = Object.keys(payload).filter((k) => k !== 'id')
    const values = columns.map((c) => payload[c])
    values.push(id)

    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ')
    const tableName = this.quoteTable(entity)

    await pool.query(`UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length}`, values)
  }

  /**
   * Execute DELETE on cloud
   */
  private async executeDelete(
    pool: ReturnType<typeof getCloudDb.prototype.getPool>,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const id = payload.id
    const tableName = this.quoteTable(entity)

    // Soft delete by setting deleted_at
    await pool.query(`UPDATE ${tableName} SET deleted_at = NOW() WHERE id = $1`, [id])
  }

  /**
   * Quote table name for PostgreSQL (handles reserved keywords)
   */
  private quoteTable(name: string): string {
    const reservedWords = ['user', 'order', 'group', 'table']
    if (reservedWords.includes(name.toLowerCase())) {
      return `"${name}"`
    }
    return name
  }
}
