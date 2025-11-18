import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './db/schema'
import { app } from 'electron'
import { join } from 'path'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqlite: Database.Database | null = null

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    // Get database path - store in userData directory
    const dbPath = process.env.LOCAL_SQLITE_PATH ||
                   join(app.getPath('userData'), 'petshop.db')
    
    // Create better-sqlite3 instance
    sqlite = new Database(dbPath)
    
    // Enable WAL mode for better concurrency
    sqlite.pragma('journal_mode = WAL')
    
    // Create Drizzle instance
    db = drizzle(sqlite, { 
      schema,
      logger: process.env.NODE_ENV === 'development'
    })
    
    console.log('✓ Database connected:', dbPath)
  }
  return db
}

export function disconnectDb(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
    console.log('✓ Database disconnected')
  }
}

// Export schema for use in services
export { schema }
