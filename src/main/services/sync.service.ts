import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema'
import * as pgSchema from '../db/pg-schema'
import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'

/**
 * SyncService - Handles bidirectional sync between local SQLite and cloud PostgreSQL
 *
 * Strategy: Delta Sync
 * - Only sync records that have changed since last sync
 * - Use syncedAt timestamp to track sync state
 * - Use deviceId to identify record origin
 * - Conflict resolution: Last write wins (based on updatedAt)
 * 
 * NOTE: Cloud sync functionality is currently disabled pending Drizzle implementation
 * for PostgreSQL cloud connection. Local database operations work normally.
 */
export class SyncService {
  private db: BetterSQLite3Database<typeof schema>
  private cloudDb: NodePgDatabase<typeof pgSchema> | null = null
  private cloudPool: Pool | null = null
  private deviceId: string

  constructor(db: BetterSQLite3Database<typeof schema>, deviceId?: string) {
    this.db = db
    this.deviceId = deviceId || this.getOrCreateDeviceId()
  }

  /**
   * Initialize cloud connection
   * Uses Drizzle with node-postgres and pg-schema
   */
  async initCloudConnection(cloudDatabaseUrl: string): Promise<void> {
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

    // Simple connectivity check
    await pool.query('SELECT 1')

    this.cloudPool = pool
    this.cloudDb = drizzle(pool, { schema: pgSchema })

    // Cloud DB is now ready for sync methods
  }

  /**
   * Get or create unique device ID
   */
  private getOrCreateDeviceId(): string {
    // In production, store this in electron-store or similar
    const stored = process.env.DEVICE_ID
    if (stored) return stored

    const newDeviceId = uuidv4()
    process.env.DEVICE_ID = newDeviceId
    return newDeviceId
  }

  /**
   * Check if cloud is connected
   */
  isCloudConnected(): boolean {
    return this.cloudDb !== null
  }

  /**
   * Full sync: Pull from cloud then push local changes
   */
  async fullSync(): Promise<SyncResult> {
    throw new Error('Cloud sync not yet implemented')
  }

  /**
   * Pull data from cloud to local (only new/updated records)
   */
  async pullFromCloud(): Promise<{ count: number; conflicts: number }> {
    throw new Error('Cloud sync not yet implemented')
  }

  /**
   * Push local data to cloud (only new/updated records)
   */
  async pushToCloud(): Promise<{ count: number; conflicts: number }> {
    throw new Error('Cloud sync not yet implemented')
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTime(): Promise<Date> {
    // In production, store this in a sync_metadata table
    // For now, use a reasonable default (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return thirtyDaysAgo
  }

  /**
   * Initial sync on first app launch
   */
  async initialSync(): Promise<SyncResult> {
    throw new Error('Cloud sync not yet implemented')
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return {
      isCloudConnected: this.isCloudConnected(),
      lastSyncTime: await this.getLastSyncTime(),
      unsyncedRecordsCount: 0, // TODO: Implement count query
      deviceId: this.deviceId
    }
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
  }
}

// Types
export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: Date
}

export interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: Date
  unsyncedRecordsCount: number
  deviceId: string
}
