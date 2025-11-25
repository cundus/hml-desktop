import { Database } from 'sql.js'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as pgSchema from '../db/pg-schema'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { saveDb } from '../localDb'

/**
 * SyncService - Handles bidirectional sync between local sql.js and cloud PostgreSQL
 *
 * Architecture:
 * - Local: sql.js (pure JS SQLite)
 * - Cloud: Drizzle ORM + node-postgres (PostgreSQL)
 * 
 * Strategy: Delta Sync with Conflict Resolution
 * - Only sync records that have changed since last sync
 * - Use syncedAt timestamp to track sync state per record
 * - Use deviceId to identify record origin
 * - Conflict resolution: Last write wins (based on updatedAt)
 * 
 * Sync Flow:
 * 1. Pull: Fetch cloud records updated since last pull → upsert to local
 * 2. Push: Fetch local records updated since last push → upsert to cloud
 * 3. Update sync metadata after successful sync
 */
export class SyncService {
  private localDb: Database
  private cloudDb: NodePgDatabase<typeof pgSchema> | null = null
  private cloudPool: Pool | null = null
  private deviceId: string

  constructor(localDb: Database, deviceId?: string) {
    this.localDb = localDb
    this.deviceId = deviceId || this.getOrCreateDeviceId()
  }

  /**
   * Initialize cloud connection
   */
  async initCloudConnection(cloudDatabaseUrl?: string): Promise<void> {
    const url = cloudDatabaseUrl || process.env.DATABASE_URL
    if (!url) {
      throw new Error('Cloud DATABASE_URL is not set')
    }

    // Close existing pool if reconnecting
    if (this.cloudPool) {
      await this.cloudPool.end()
      this.cloudPool = null
      this.cloudDb = null
    }

    const pool = new Pool({ connectionString: url })

    // Connectivity check
    await pool.query('SELECT 1')

    this.cloudPool = pool
    this.cloudDb = drizzle(pool, { schema: pgSchema })

    console.log('✓ Cloud database connected')
  }

  /**
   * Get or create unique device ID
   */
  private getOrCreateDeviceId(): string {
    // Check if device ID exists in sync_metadata
    const stmt = this.localDb.prepare(
      "SELECT device_id FROM sync_metadata WHERE entity_name = 'device' LIMIT 1"
    )
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row.device_id as string
    }
    stmt.free()

    // Create new device ID
    const newDeviceId = randomUUID()
    this.localDb.run(
      "INSERT INTO sync_metadata (entity_name, device_id) VALUES ('device', ?)",
      [newDeviceId]
    )
    saveDb(this.localDb)

    return newDeviceId
  }

  /**
   * Check if cloud is connected
   */
  isCloudConnected(): boolean {
    return this.cloudDb !== null && this.cloudPool !== null
  }

  /**
   * Full sync: Pull from cloud then push local changes
   */
  async fullSync(): Promise<SyncResult> {
    if (!this.isCloudConnected()) {
      throw new Error('Cloud not connected. Call initCloudConnection() first.')
    }

    const result: SyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date(),
      byEntity: {}
    }

    try {
      // Pull first (cloud is source of truth for conflicts)
      const pullResult = await this.pullFromCloud()
      result.pulled = pullResult.count
      result.conflicts += pullResult.conflicts
      this.mergeEntityStats(result.byEntity!, pullResult.byEntity)

      // Then push local changes
      const pushResult = await this.pushToCloud()
      result.pushed = pushResult.count
      result.conflicts += pushResult.conflicts
      this.mergeEntityStats(result.byEntity!, pushResult.byEntity)

      console.log(`✓ Full sync complete: pulled ${result.pulled}, pushed ${result.pushed}`)
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : String(error))
      console.error('✗ Full sync failed:', error)
    }

    return result
  }

  /**
   * Pull data from cloud to local (only new/updated records)
   */
  async pullFromCloud(): Promise<{ count: number; conflicts: number; byEntity: Record<string, EntitySyncStats> }> {
    if (!this.isCloudConnected() || !this.cloudDb) {
      throw new Error('Cloud not connected')
    }

    let totalCount = 0
    let totalConflicts = 0
    const byEntity: Record<string, EntitySyncStats> = {}

    // Define entities to sync (including RBAC tables)
    const entities = [
      'category',
      'supplier',
      'store',
      'customer_category',
      'user',
      'product',
      'uom',
      'role',
      'permission',
      'user_role',
      'role_permission'
    ]

    for (const entity of entities) {
      try {
        const { count, conflicts } = await this.pullEntityFromCloud(entity)
        totalCount += count
        totalConflicts += conflicts
        byEntity[entity] = {
          pulled: count,
          pushed: 0,
          conflicts
        }
      } catch (error) {
        console.error(`Error pulling ${entity}:`, error)
        throw error
      }
    }

    // Update last pull timestamp
    this.updateSyncMetadata('last_pull_at')

    return { count: totalCount, conflicts: totalConflicts, byEntity }
  }

  /**
   * Pull single entity from cloud
   */
  private async pullEntityFromCloud(entityName: string): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudDb) throw new Error('Cloud not connected')

    const lastPullAt = this.getLastSyncTime(entityName, 'last_pull_at')
    const lastPullDate = new Date(lastPullAt)
    
    // Fetch records from cloud that were updated since last pull
    // Using raw query via the pool directly
    if (!this.cloudPool) throw new Error('Cloud pool not available')
    const cloudRecords = await this.cloudPool.query(
      `SELECT * FROM ${entityName} WHERE updated_at > $1 OR synced_at > $1`,
      [lastPullDate]
    )

    let count = 0
    let conflicts = 0

    for (const cloudRecord of cloudRecords.rows) {
      // Check if record exists locally
      const localStmt = this.localDb.prepare(`SELECT * FROM ${entityName} WHERE id = ?`)
      localStmt.bind([cloudRecord.id])
      
      const hasLocal = localStmt.step()
      const localRecord = hasLocal ? localStmt.getAsObject() : null
      localStmt.free()

      if (!localRecord) {
        // New record - insert
        this.insertRecordToLocal(entityName, cloudRecord)
        count++
      } else {
        // Existing record - check for conflict
        const localUpdatedAt = localRecord.updated_at as number
        const cloudUpdatedAt = new Date(cloudRecord.updated_at as string).getTime()

        if (cloudUpdatedAt > localUpdatedAt) {
          // Cloud is newer - update local
          this.updateRecordInLocal(entityName, cloudRecord)
          count++
        } else if (localUpdatedAt > cloudUpdatedAt) {
          // Local is newer - conflict (will be resolved on push)
          conflicts++
        }
        // If equal, no action needed
      }
    }

    return { count, conflicts }
  }

  /**
   * Push local data to cloud (only new/updated records)
   */
  async pushToCloud(): Promise<{ count: number; conflicts: number; byEntity: Record<string, EntitySyncStats> }> {
    if (!this.isCloudConnected() || !this.cloudDb) {
      throw new Error('Cloud not connected')
    }

    let totalCount = 0
    let totalConflicts = 0
    const byEntity: Record<string, EntitySyncStats> = {}

    const entities = [
      'category',
      'supplier',
      'store',
      'customer_category',
      'user',
      'product',
      'uom',
      'role',
      'permission',
      'user_role',
      'role_permission'
    ]

    for (const entity of entities) {
      try {
        const { count, conflicts } = await this.pushEntityToCloud(entity)
        totalCount += count
        totalConflicts += conflicts
        byEntity[entity] = {
          pulled: 0,
          pushed: count,
          conflicts
        }
      } catch (error) {
        console.error(`Error pushing ${entity}:`, error)
        throw error
      }
    }

    // Update last push timestamp
    this.updateSyncMetadata('last_push_at')

    return { count: totalCount, conflicts: totalConflicts, byEntity }
  }

  /**
   * Push single entity to cloud
   */
  private async pushEntityToCloud(entityName: string): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudDb) throw new Error('Cloud not connected')

    const lastPushAt = this.getLastSyncTime(entityName, 'last_push_at')

    // Fetch local records that were updated since last push
    const stmt = this.localDb.prepare(
      `SELECT * FROM ${entityName} WHERE updated_at > ? OR synced_at IS NULL`
    )
    stmt.bind([lastPushAt])

    const localRecords: any[] = []
    while (stmt.step()) {
      localRecords.push(stmt.getAsObject())
    }
    stmt.free()

    let count = 0
    let conflicts = 0

    for (const localRecord of localRecords) {
      try {
        // Check if record exists in cloud
        if (!this.cloudPool) throw new Error('Cloud pool not available')
        const cloudResult = await this.cloudPool.query(
          `SELECT * FROM ${entityName} WHERE id = $1`,
          [localRecord.id]
        )

        if (cloudResult.rows.length === 0) {
          // New record - insert to cloud
          await this.insertRecordToCloud(entityName, localRecord)
          count++
        } else {
          // Existing record - check for conflict
          const cloudRecord = cloudResult.rows[0]
          const localUpdatedAt = localRecord.updated_at as number
          const cloudUpdatedAt = new Date(cloudRecord.updated_at as string).getTime()

          if (localUpdatedAt > cloudUpdatedAt) {
            // Local is newer - update cloud
            await this.updateRecordInCloud(entityName, localRecord)
            count++
          } else if (cloudUpdatedAt > localUpdatedAt) {
            // Cloud is newer - conflict (already handled in pull)
            conflicts++
          }
        }

        // Mark as synced locally
        this.localDb.run(
          `UPDATE ${entityName} SET synced_at = ? WHERE id = ?`,
          [Date.now(), localRecord.id]
        )
      } catch (error) {
        console.error(`Error pushing record ${localRecord.id}:`, error)
        throw error
      }
    }

    saveDb(this.localDb)
    return { count, conflicts }
  }

  /**
   * Insert record to local database
   */
  private insertRecordToLocal(entityName: string, record: any): void {
    const columns = Object.keys(record)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map(col => {
      const val = record[col]
      // Convert Date to timestamp
      if (val instanceof Date) return val.getTime()
      if (typeof val === 'boolean') return val ? 1 : 0
      return val
    })

    this.localDb.run(
      `INSERT OR REPLACE INTO ${entityName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    )
    saveDb(this.localDb)
  }

  /**
   * Update record in local database
   */
  private updateRecordInLocal(entityName: string, record: any): void {
    const columns = Object.keys(record).filter(col => col !== 'id')
    const setClause = columns.map(col => `${col} = ?`).join(', ')
    const values = columns.map(col => {
      const val = record[col]
      if (val instanceof Date) return val.getTime()
      if (typeof val === 'boolean') return val ? 1 : 0
      return val
    })
    values.push(record.id)

    this.localDb.run(
      `UPDATE ${entityName} SET ${setClause} WHERE id = ?`,
      values
    )
    saveDb(this.localDb)
  }

  /**
   * Insert record to cloud database
   */
  private async insertRecordToCloud(entityName: string, record: any): Promise<void> {
    if (!this.cloudPool) throw new Error('Cloud not connected')

    const columns = Object.keys(record)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const values = columns.map(col => {
      const val = record[col]
      // Convert timestamp to Date
      if (col.endsWith('_at') && typeof val === 'number') {
        return new Date(val)
      }
      if (typeof val === 'number' && col === 'is_active') {
        return val === 1
      }
      return val
    })

    await this.cloudPool.query(
      `INSERT INTO ${entityName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING`,
      values
    )
  }

  /**
   * Update record in cloud database
   */
  private async updateRecordInCloud(entityName: string, record: any): Promise<void> {
    if (!this.cloudPool) throw new Error('Cloud not connected')

    const columns = Object.keys(record).filter(col => col !== 'id')
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')
    const values = columns.map(col => {
      const val = record[col]
      if (col.endsWith('_at') && typeof val === 'number') {
        return new Date(val)
      }
      if (typeof val === 'number' && col === 'is_active') {
        return val === 1
      }
      return val
    })
    values.push(record.id)

    await this.cloudPool.query(
      `UPDATE ${entityName} SET ${setClause} WHERE id = $${values.length}`,
      values
    )
  }

  /**
   * Get last sync time for entity
   */
  private getLastSyncTime(entityName: string, column: 'last_pull_at' | 'last_push_at'): number {
    const stmt = this.localDb.prepare(
      `SELECT ${column} FROM sync_metadata WHERE entity_name = ?`
    )
    stmt.bind([entityName])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const timestamp = row[column]
      return timestamp ? (timestamp as number) : 0
    }
    stmt.free()

    // Initialize metadata for this entity
    this.localDb.run(
      'INSERT OR IGNORE INTO sync_metadata (entity_name, device_id) VALUES (?, ?)',
      [entityName, this.deviceId]
    )
    saveDb(this.localDb)

    return 0 // Never synced before
  }

  /**
   * Update sync metadata timestamp
   */
  private updateSyncMetadata(column: 'last_pull_at' | 'last_push_at'): void {
    const now = Date.now()
    const entities = [
      'category',
      'supplier',
      'store',
      'customer_category',
      'user',
      'product',
      'role',
      'permission',
      'user_role',
      'role_permission'
    ]

    for (const entity of entities) {
      this.localDb.run(
        `UPDATE sync_metadata SET ${column} = ?, last_sync_at = ? WHERE entity_name = ?`,
        [now, now, entity]
      )
    }
    saveDb(this.localDb)
  }

  /**
   * Initial sync on first app launch
   */
  async initialSync(): Promise<SyncResult> {
    console.log('Starting initial sync...')
    return await this.fullSync()
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const unsyncedCount = this.getUnsyncedRecordsCount()
    const lastSyncTime = this.getGlobalLastSyncTime()

    return {
      isCloudConnected: this.isCloudConnected(),
      lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
      unsyncedRecordsCount: unsyncedCount,
      deviceId: this.deviceId
    }
  }

  /**
   * Get count of unsynced records
   */
  private getUnsyncedRecordsCount(): number {
    const entities = [
      'category',
      'supplier',
      'store',
      'customer_category',
      'user',
      'product',
      'role',
      'permission',
      'user_role',
      'role_permission'
    ]
    let total = 0

    for (const entity of entities) {
      const stmt = this.localDb.prepare(
        `SELECT COUNT(*) as count FROM ${entity} WHERE synced_at IS NULL OR synced_at < updated_at`
      )
      if (stmt.step()) {
        const row = stmt.getAsObject()
        total += row.count as number
      }
      stmt.free()
    }

    return total
  }

  /**
   * Get global last sync time (most recent across all entities)
   */
  private getGlobalLastSyncTime(): number | null {
    const stmt = this.localDb.prepare(
      'SELECT MAX(last_sync_at) as max_sync FROM sync_metadata'
    )
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row.max_sync as number | null
    }
    stmt.free()
    return null
  }

  /**
   * Disconnect cloud connection
   */
  async disconnect(): Promise<void> {
    if (this.cloudPool) {
      await this.cloudPool.end()
      this.cloudPool = null
    }
    this.cloudDb = null
    console.log('✓ Cloud database disconnected')
  }
}

// Types
export interface EntitySyncStats {
  pulled: number
  pushed: number
  conflicts: number
}

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: Date
  byEntity?: Record<string, EntitySyncStats>
}

export interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: Date | null
  unsyncedRecordsCount: number
  deviceId: string
}

// Helpers
type EntityStatsMap = Record<string, EntitySyncStats>

declare module './sync.service' {
  interface SyncService {
    mergeEntityStats(target: EntityStatsMap, source: EntityStatsMap): void
  }
}

SyncService.prototype.mergeEntityStats = function (this: SyncService, target: EntityStatsMap, source: EntityStatsMap): void {
  for (const [entity, stats] of Object.entries(source)) {
    const existing = target[entity] || { pulled: 0, pushed: 0, conflicts: 0 }
    target[entity] = {
      pulled: existing.pulled + stats.pulled,
      pushed: existing.pushed + stats.pushed,
      conflicts: existing.conflicts + stats.conflicts
    }
  }
}
