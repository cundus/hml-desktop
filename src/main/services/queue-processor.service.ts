import { Pool, PoolClient } from 'pg'
import { getCloudDb } from './cloud-db.service'
import { getConnectivity } from './connectivity.service'
import { QueueService, QueueItem } from './queue.service'
import { getSyncLockService } from './sync-lock.service'

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

    // Recover any stale processing items from previous run/crash
    this.queueService.recoverStaleProcessing()

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

    // Acquire lock to prevent conflict with SyncService
    const lock = getSyncLockService()
    if (!lock.acquire('sync')) {
      return
    }

    this.isProcessing = true
    
    try {
      const cloudDb = getCloudDb()
      const pool = cloudDb.getPool()

      // 1. Process Grouped Items (Transactions)
      const groups = this.queueService.getPendingGroups()
      
      if (groups.length > 0) {
        console.log(`[QueueProcessor] Processing ${groups.length} groups...`)
        
        for (const group of groups) {
          const client = await pool.connect()
          this.queueService.markGroupProcessing(group.groupId)
          
          try {
            await client.query('BEGIN')
            
            // Items are already sorted by priority from getPendingGroups()
            for (const item of group.items) {
              await this.executeItem(item, client)
            }
            
            await client.query('COMMIT')
            this.queueService.markGroupComplete(group.groupId)
          } catch (error) {
            await client.query('ROLLBACK')
            const errorMsg = error instanceof Error ? error.message : String(error)
            
            // Check retry count of first item to determine group retry status
            const firstItem = group.items[0]
            if (firstItem.retryCount >= MAX_RETRIES - 1) {
              this.queueService.markGroupFailed(group.groupId, errorMsg)
              console.error(`[QueueProcessor] Max retries exceeded for group ${group.groupId}`)
            } else {
              this.queueService.markGroupRetry(group.groupId, errorMsg)
              
              // Apply backoff based on group retry count
              const delay = BASE_RETRY_DELAY_MS * Math.pow(2, firstItem.retryCount)
              console.log(`[QueueProcessor] Waiting ${delay}ms before retry group ${group.groupId}...`)
              // We don't sleep here to avoid blocking other groups, just separate failures
            }
          } finally {
            client.release()
          }
        }
      }

      // 2. Process Ungrouped Items (Individual)
      // Filter out items that have group_id (they should be handled above, but double check)
      const pending = this.queueService.getPending().filter(i => !i.groupId)

      if (pending.length > 0) {
        console.log(`[QueueProcessor] Processing ${pending.length} individual items...`)

        for (const item of pending) {
          try {
            // Apply exponential backoff delay based on retry count
            if (item.retryCount > 0) {
              const delay = BASE_RETRY_DELAY_MS * Math.pow(2, item.retryCount - 1)
              console.log(`[QueueProcessor] Waiting ${delay}ms before retry ${item.retryCount}...`)
              await this.sleep(delay)
            }

            this.queueService.markProcessing(item.id)
            await this.executeItem(item, pool)
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
      }
    } catch (error) {
      console.error('[QueueProcessor] Error dealing with queue:', error)
    } finally {
      this.isProcessing = false
      getSyncLockService().release('sync')
      // console.log('[QueueProcessor] Processing complete')
    }
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
  private async executeItem(item: QueueItem, clientOrPool: Pool | PoolClient): Promise<void> {
    const payload = this.queueService.parsePayload(item)
    const entity = item.entity

    switch (item.action) {
      case 'INSERT':
        await this.executeInsert(clientOrPool, entity, payload)
        break
      case 'UPDATE':
        await this.executeUpdate(clientOrPool, entity, payload)
        break
      case 'DELETE':
        await this.executeDelete(clientOrPool, entity, payload)
        break
      default:
        throw new Error(`Unknown action: ${item.action}`)
    }
  }

  /**
   * Execute INSERT on cloud
   */
  private async executeInsert(
    clientOrPool: Pool | PoolClient,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const columns = Object.keys(payload)
    const values = Object.values(payload)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const tableName = this.quoteTable(entity)

    await clientOrPool.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET ${columns.map((c, i) => `${c} = $${i + 1}`).join(', ')}`,
      values
    )
  }

  /**
   * Execute UPDATE on cloud
   */
  private async executeUpdate(
    clientOrPool: Pool | PoolClient,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const id = payload.id
    const columns = Object.keys(payload).filter((k) => k !== 'id')
    const values = columns.map((c) => payload[c])
    values.push(id)

    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ')
    const tableName = this.quoteTable(entity)

    await clientOrPool.query(`UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length}`, values)
  }

  /**
   * Execute DELETE on cloud
   */
  private async executeDelete(
    clientOrPool: Pool | PoolClient,
    entity: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const id = payload.id
    const tableName = this.quoteTable(entity)

    // Soft delete by setting deleted_at
    await clientOrPool.query(`UPDATE ${tableName} SET deleted_at = NOW() WHERE id = $1`, [id])
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
