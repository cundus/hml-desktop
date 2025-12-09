import { Database } from 'sql.js'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as pgSchema from '../db/pg-schema'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { saveDb } from '../localDb'

/**
 * Entity configuration for sync
 * Maps entity names to their column configurations
 */
const ENTITY_CONFIG: Record<
  string,
  {
    columns: string[]
    hasDeviceId: boolean
  }
> = {
  category: {
    columns: ['id', 'name', 'created_at', 'updated_at', 'synced_at', 'deleted_at'],
    hasDeviceId: false
  },
  supplier: {
    columns: [
      'id',
      'name',
      'phone',
      'address',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: false
  },
  store: {
    columns: [
      'id',
      'code',
      'name',
      'address',
      'type',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: false
  },
  customer_category: {
    columns: ['id', 'name', 'created_at', 'updated_at', 'synced_at', 'deleted_at'],
    hasDeviceId: false
  },
  customer: {
    columns: [
      'id',
      'name',
      'phone',
      'address',
      'category_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: false
  },
  uom: {
    columns: [
      'id',
      'code',
      'name',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  user: {
    columns: [
      'id',
      'name',
      'email',
      'password',
      'pin',
      'store_id',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  product: {
    columns: [
      'id',
      'sku',
      'name',
      'description',
      'unit',
      'cost',
      'category_id',
      'is_active',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  role: {
    columns: [
      'id',
      'name',
      'description',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  permission: {
    columns: [
      'id',
      'name',
      'description',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  user_role: {
    columns: [
      'id',
      'user_id',
      'role_id',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  role_permission: {
    columns: [
      'id',
      'role_id',
      'permission_id',
      'device_id',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: true
  },
  price_category: {
    columns: [
      'id',
      'name',
      'description',
      'is_default',
      'sort_order',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  product_uom: {
    columns: [
      'id',
      'product_id',
      'uom_id',
      'conversion_factor',
      'is_base_unit',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  product_uom_category_price: {
    columns: [
      'id',
      'product_id',
      'uom_id',
      'price_category_id',
      'price',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  store_product_uom_price: {
    columns: [
      'id',
      'product_id',
      'uom_id',
      'price_category_id',
      'store_id',
      'price',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  product_location: {
    columns: [
      'id',
      'product_id',
      'store_id',
      'quantity',
      'reserved_quantity',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  stock_transaction: {
    columns: [
      'id',
      'product_id',
      'store_id',
      'type',
      'quantity',
      'reference',
      'batch_id',
      'supplier_id',
      'customer_id',
      'performed_by',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  product_price: {
    columns: [
      'id',
      'product_id',
      'store_id',
      'price',
      'cost',
      'is_active',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at',
      'device_id'
    ],
    hasDeviceId: true
  },
  batch: {
    columns: [
      'id',
      'product_id',
      'code',
      'expiry_date',
      'created_at',
      'updated_at',
      'synced_at',
      'deleted_at'
    ],
    hasDeviceId: false
  }
}

// List of entities to sync
const SYNC_ENTITIES = Object.keys(ENTITY_CONFIG)

/**
 * Quote table name for PostgreSQL (handles reserved keywords like 'user')
 */
function pgTable(name: string): string {
  // Always quote table names to handle reserved keywords
  return `"${name}"`
}

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
    const url = cloudDatabaseUrl || process.env.PG_DATABASE_URL || process.env.DATABASE_URL
    if (!url) {
      throw new Error('Cloud PG_DATABASE_URL is not set')
    }

    // Log connection URL (masked for security)
    const maskedUrl = url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    console.log('Connecting to cloud database:', maskedUrl)

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
    this.localDb.run("INSERT INTO sync_metadata (entity_name, device_id) VALUES ('device', ?)", [
      newDeviceId
    ])
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
      console.log('Starting pull from cloud...')
      // Pull first (cloud is source of truth for conflicts)
      const pullResult = await this.pullFromCloud()
      result.pulled = pullResult.count
      result.conflicts += pullResult.conflicts
      this.mergeEntityStats(result.byEntity!, pullResult.byEntity)
      console.log(`✓ Pull complete: ${pullResult.count} records`)

      console.log('Starting push to cloud...')
      // Then push local changes
      const pushResult = await this.pushToCloud()
      result.pushed = pushResult.count
      result.conflicts += pushResult.conflicts
      this.mergeEntityStats(result.byEntity!, pushResult.byEntity)
      console.log(`✓ Push complete: ${pushResult.count} records`)

      console.log(
        `✓ Full sync complete: pulled ${result.pulled}, pushed ${result.pushed}, conflicts ${result.conflicts}`
      )
    } catch (error) {
      result.success = false
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMsg)
      console.error('✗ Full sync failed:', errorMsg)
    }

    return result
  }

  /**
   * Pull data from cloud to local (only new/updated records)
   */
  async pullFromCloud(): Promise<{
    count: number
    conflicts: number
    byEntity: Record<string, EntitySyncStats>
  }> {
    if (!this.isCloudConnected() || !this.cloudDb) {
      throw new Error('Cloud not connected')
    }

    let totalCount = 0
    let totalConflicts = 0
    const byEntity: Record<string, EntitySyncStats> = {}

    for (const entity of SYNC_ENTITIES) {
      try {
        console.log(`  Pulling ${entity}...`)
        const { count, conflicts } = await this.pullEntityFromCloud(entity)
        totalCount += count
        totalConflicts += conflicts
        byEntity[entity] = {
          pulled: count,
          pushed: 0,
          conflicts
        }
        if (count > 0 || conflicts > 0) {
          console.log(`    ✓ ${entity}: ${count} pulled, ${conflicts} conflicts`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`  ✗ Error pulling ${entity}: ${errorMsg}`)
        throw new Error(`Failed to pull ${entity}: ${errorMsg}`)
      }
    }

    // Update last pull timestamp
    this.updateSyncMetadata('last_pull_at')

    return { count: totalCount, conflicts: totalConflicts, byEntity }
  }

  /**
   * Pull single entity from cloud
   */
  private async pullEntityFromCloud(
    entityName: string
  ): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPool) throw new Error('Cloud pool not available')

    const config = ENTITY_CONFIG[entityName]
    if (!config) throw new Error(`Unknown entity: ${entityName}`)

    const lastPullAt = this.getLastSyncTime(entityName, 'last_pull_at')
    const lastPullDate = lastPullAt > 0 ? new Date(lastPullAt) : new Date(0)

    // Fetch records from cloud that were updated since last pull
    // Only select columns that exist in both local and cloud
    const columns = config.columns.join(', ')
    const tableName = pgTable(entityName) // Quote table name for PostgreSQL
    const cloudRecords = await this.cloudPool.query(
      `SELECT ${columns} FROM ${tableName} WHERE updated_at > $1 OR synced_at > $1 OR synced_at IS NULL`,
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

      // Convert cloud record timestamps to local format
      const normalizedCloudRecord = this.normalizeCloudRecord(cloudRecord)

      if (!localRecord) {
        // New record - insert
        this.insertRecordToLocal(entityName, normalizedCloudRecord, config.columns)
        count++
      } else {
        // Existing record - check for conflict
        const localUpdatedAt = (localRecord.updated_at as number) || 0
        const cloudUpdatedAt = this.toTimestamp(cloudRecord.updated_at)

        if (cloudUpdatedAt > localUpdatedAt) {
          // Cloud is newer - update local
          this.updateRecordInLocal(entityName, normalizedCloudRecord, config.columns)
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
   * Normalize cloud record for local storage
   * Converts Date objects to timestamps, booleans to integers
   */
  private normalizeCloudRecord(record: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
      if (value instanceof Date) {
        normalized[key] = value.getTime()
      } else if (typeof value === 'boolean') {
        normalized[key] = value ? 1 : 0
      } else {
        normalized[key] = value
      }
    }
    return normalized
  }

  /**
   * Convert various date formats to timestamp
   */
  private toTimestamp(value: unknown): number {
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'string') return new Date(value).getTime()
    if (typeof value === 'number') return value
    return 0
  }

  /**
   * Push local data to cloud (only new/updated records)
   */
  async pushToCloud(): Promise<{
    count: number
    conflicts: number
    byEntity: Record<string, EntitySyncStats>
  }> {
    if (!this.isCloudConnected() || !this.cloudDb) {
      throw new Error('Cloud not connected')
    }

    let totalCount = 0
    let totalConflicts = 0
    const byEntity: Record<string, EntitySyncStats> = {}

    for (const entity of SYNC_ENTITIES) {
      try {
        console.log(`  Pushing ${entity}...`)
        const { count, conflicts } = await this.pushEntityToCloud(entity)
        totalCount += count
        totalConflicts += conflicts
        byEntity[entity] = {
          pulled: 0,
          pushed: count,
          conflicts
        }
        if (count > 0 || conflicts > 0) {
          console.log(`    ✓ ${entity}: ${count} pushed, ${conflicts} conflicts`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`  ✗ Error pushing ${entity}: ${errorMsg}`)
        throw new Error(`Failed to push ${entity}: ${errorMsg}`)
      }
    }

    // Update last push timestamp
    this.updateSyncMetadata('last_push_at')

    return { count: totalCount, conflicts: totalConflicts, byEntity }
  }

  /**
   * Push single entity to cloud
   */
  private async pushEntityToCloud(
    entityName: string
  ): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPool) throw new Error('Cloud pool not available')

    const config = ENTITY_CONFIG[entityName]
    if (!config) throw new Error(`Unknown entity: ${entityName}`)

    const lastPushAt = this.getLastSyncTime(entityName, 'last_push_at')

    // Fetch local records that were updated since last push
    const columns = config.columns.join(', ')
    const stmt = this.localDb.prepare(
      `SELECT ${columns} FROM ${entityName} WHERE updated_at > ? OR synced_at IS NULL`
    )
    stmt.bind([lastPushAt])

    const localRecords: any[] = []
    while (stmt.step()) {
      localRecords.push(stmt.getAsObject())
    }
    stmt.free()

    let count = 0
    let conflicts = 0

    const tableName = pgTable(entityName) // Quote table name for PostgreSQL

    for (const localRecord of localRecords) {
      try {
        // Check if record exists in cloud
        if (!this.cloudPool) throw new Error('Cloud pool not available')
        const cloudResult = await this.cloudPool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [
          localRecord.id
        ])

        if (cloudResult.rows.length === 0) {
          // New record - insert to cloud
          await this.insertRecordToCloud(entityName, localRecord, config.columns)
          count++
        } else {
          // Existing record - check for conflict
          const cloudRecord = cloudResult.rows[0]
          const localUpdatedAt = (localRecord.updated_at as number) || 0
          const cloudUpdatedAt = this.toTimestamp(cloudRecord.updated_at)

          if (localUpdatedAt > cloudUpdatedAt) {
            // Local is newer - update cloud
            await this.updateRecordInCloud(entityName, localRecord, config.columns)
            count++
          } else if (cloudUpdatedAt > localUpdatedAt) {
            // Cloud is newer - conflict (already handled in pull)
            conflicts++
          }
        }

        // Mark as synced locally
        this.localDb.run(`UPDATE ${entityName} SET synced_at = ? WHERE id = ?`, [
          Date.now(),
          localRecord.id
        ])
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
  private insertRecordToLocal(
    entityName: string,
    record: Record<string, unknown>,
    allowedColumns: string[]
  ): void {
    // Only use columns that are in the allowed list
    const columns = allowedColumns.filter((col) => col in record)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map((col) => this.toSqlValue(record[col]))

    this.localDb.run(
      `INSERT OR REPLACE INTO ${entityName} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    )
    saveDb(this.localDb)
  }

  /**
   * Update record in local database
   */
  private updateRecordInLocal(
    entityName: string,
    record: Record<string, unknown>,
    allowedColumns: string[]
  ): void {
    // Only use columns that are in the allowed list (except id)
    const columns = allowedColumns.filter((col) => col !== 'id' && col in record)
    const setClause = columns.map((col) => `${col} = ?`).join(', ')
    const values = columns.map((col) => this.toSqlValue(record[col]))
    values.push(this.toSqlValue(record.id))

    this.localDb.run(`UPDATE ${entityName} SET ${setClause} WHERE id = ?`, values)
    saveDb(this.localDb)
  }

  /**
   * Convert value to SQL-compatible type
   */
  private toSqlValue(value: unknown): string | number | null | Uint8Array {
    if (value === null || value === undefined) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1 : 0
    if (value instanceof Date) return value.getTime()
    if (value instanceof Uint8Array) return value
    return String(value)
  }

  /**
   * Insert record to cloud database
   */
  private async insertRecordToCloud(
    entityName: string,
    record: Record<string, unknown>,
    allowedColumns: string[]
  ): Promise<void> {
    if (!this.cloudPool) throw new Error('Cloud not connected')

    // Only use columns that are in the allowed list
    const columns = allowedColumns.filter((col) => col in record)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const values = columns.map((col) => this.toCloudValue(col, record[col]))
    const tableName = pgTable(entityName)

    await this.cloudPool.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING`,
      values
    )
  }

  /**
   * Update record in cloud database
   */
  private async updateRecordInCloud(
    entityName: string,
    record: Record<string, unknown>,
    allowedColumns: string[]
  ): Promise<void> {
    if (!this.cloudPool) throw new Error('Cloud not connected')

    // Only use columns that are in the allowed list (except id)
    const columns = allowedColumns.filter((col) => col !== 'id' && col in record)
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')
    const values = columns.map((col) => this.toCloudValue(col, record[col]))
    values.push(record.id)
    const tableName = pgTable(entityName)

    await this.cloudPool.query(
      `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length}`,
      values
    )
  }

  /**
   * Convert local value to cloud-compatible type
   */
  private toCloudValue(column: string, value: unknown): unknown {
    if (value === null || value === undefined) return null
    // Convert timestamp to Date for _at columns
    if (column.endsWith('_at') && typeof value === 'number') {
      return new Date(value)
    }
    // Convert integer to boolean for is_active
    if (column === 'is_active' && typeof value === 'number') {
      return value === 1
    }
    return value
  }

  /**
   * Get last sync time for entity
   */
  private getLastSyncTime(entityName: string, column: 'last_pull_at' | 'last_push_at'): number {
    const stmt = this.localDb.prepare(`SELECT ${column} FROM sync_metadata WHERE entity_name = ?`)
    stmt.bind([entityName])

    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      const timestamp = row[column]
      return timestamp ? (timestamp as number) : 0
    }
    stmt.free()

    // Initialize metadata for this entity
    this.localDb.run('INSERT OR IGNORE INTO sync_metadata (entity_name, device_id) VALUES (?, ?)', [
      entityName,
      this.deviceId
    ])
    saveDb(this.localDb)

    return 0 // Never synced before
  }

  /**
   * Update sync metadata timestamp
   */
  private updateSyncMetadata(column: 'last_pull_at' | 'last_push_at'): void {
    const now = Date.now()

    for (const entity of SYNC_ENTITIES) {
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
    let total = 0

    for (const entity of SYNC_ENTITIES) {
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
    const stmt = this.localDb.prepare('SELECT MAX(last_sync_at) as max_sync FROM sync_metadata')

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

SyncService.prototype.mergeEntityStats = function (
  this: SyncService,
  target: EntityStatsMap,
  source: EntityStatsMap
): void {
  for (const [entity, stats] of Object.entries(source)) {
    const existing = target[entity] || { pulled: 0, pushed: 0, conflicts: 0 }
    target[entity] = {
      pulled: existing.pulled + stats.pulled,
      pushed: existing.pushed + stats.pushed,
      conflicts: existing.conflicts + stats.conflicts
    }
  }
}
