import { Database } from 'sql.js'
import { initLocalDb, closeLocalDb, getLocalDb } from './localDb'

let initialized = false

/**
 * Initialize and get the local sql.js database
 */
export async function getDb(): Promise<Database> {
  if (!initialized) {
    await initLocalDb()
    initialized = true
  }
  return getLocalDb()
}

/**
 * Close the local database
 */
export function disconnectDb(): void {
  closeLocalDb()
  initialized = false
}
