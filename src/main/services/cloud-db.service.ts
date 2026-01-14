import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as pgSchema from '../db/pg-schema'

/**
 * CloudDbService - Manages PostgreSQL cloud database connection
 * Singleton pattern with lazy initialization and reconnect logic
 */
export class CloudDbService {
  private static instance: CloudDbService | null = null
  private pool: Pool | null = null
  private db: NodePgDatabase<typeof pgSchema> | null = null
  private isConnecting = false
  private connectionError: Error | null = null

  private constructor() {}

  static getInstance(): CloudDbService {
    if (!CloudDbService.instance) {
      CloudDbService.instance = new CloudDbService()
    }
    return CloudDbService.instance
  }

  /**
   * Initialize cloud connection
   */
  async connect(databaseUrl?: string): Promise<void> {
    if (this.isConnecting) {
      console.log('[CloudDb] Connection already in progress...')
      return
    }

    const url = databaseUrl || process.env.PG_DATABASE_URL || process.env.DATABASE_URL
    if (!url) {
      throw new Error('Cloud database URL is not configured')
    }

    this.isConnecting = true
    this.connectionError = null

    try {
      // Close existing pool if reconnecting
      if (this.pool) {
        await this.pool.end()
        this.pool = null
        this.db = null
      }

      const maskedUrl = url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      console.log('[CloudDb] Connecting to:', maskedUrl)

      this.pool = new Pool({ 
        connectionString: url,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10
      })

      // Test connection
      const client = await this.pool.connect()
      console.log('[CloudDb] Connection successful')
      client.release()

      this.db = drizzle(this.pool, { schema: pgSchema })
    } catch (error) {
      this.connectionError = error instanceof Error ? error : new Error(String(error))
      console.error('[CloudDb] Connection failed:', this.connectionError.message)
      throw this.connectionError
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Check if connected to cloud database
   */
  isConnected(): boolean {
    return this.pool !== null && this.db !== null
  }

  /**
   * Get Drizzle database instance
   */
  getDb(): NodePgDatabase<typeof pgSchema> {
    if (!this.db) {
      throw new Error('Cloud database not connected. Call connect() first.')
    }
    return this.db
  }

  /**
   * Get raw Pool for direct queries
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Cloud database not connected. Call connect() first.')
    }
    return this.pool
  }

  /**
   * Execute a health check query
   */
  async ping(): Promise<boolean> {
    if (!this.pool) return false
    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    } catch {
      return false
    }
  }

  /**
   * Disconnect from cloud database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.db = null
      console.log('[CloudDb] Disconnected')
    }
  }

  /**
   * Get last connection error
   */
  getLastError(): Error | null {
    return this.connectionError
  }
}

// Export singleton getter
export function getCloudDb(): CloudDbService {
  return CloudDbService.getInstance()
}
