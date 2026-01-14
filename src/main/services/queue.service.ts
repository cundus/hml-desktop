import { Database } from 'sql.js'
import { randomUUID } from 'crypto'
import { saveDb } from '../localDb'

export type QueueAction = 'INSERT' | 'UPDATE' | 'DELETE'
export type QueueStatus = 'pending' | 'processing' | 'failed' | 'completed'

export interface QueueItem {
  id: string
  action: QueueAction
  entity: string
  payload: string // JSON stringified
  createdAt: number
  retryCount: number
  lastError: string | null
  status: QueueStatus
}

/**
 * QueueService - Manages offline operation queue
 * Stores pending operations when offline, replays when online
 */
export class QueueService {
  private db: Database

  constructor(db: Database) {
    this.db = db
    this.ensureTableExists()
  }

  /**
   * Ensure queue table exists
   */
  private ensureTableExists(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS operation_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        status TEXT DEFAULT 'pending'
      )
    `)
    saveDb(this.db)
  }

  /**
   * Add operation to queue
   */
  async add(action: QueueAction, entity: string, payload: Record<string, unknown>): Promise<string> {
    const id = randomUUID()
    const now = Date.now()
    const payloadJson = JSON.stringify(payload)

    this.db.run(
      `INSERT INTO operation_queue (id, action, entity, payload, created_at, retry_count, status) 
       VALUES (?, ?, ?, ?, ?, 0, 'pending')`,
      [id, action, entity, payloadJson, now]
    )
    saveDb(this.db)

    console.log(`[Queue] Added: ${action} ${entity} (${id})`)
    return id
  }

  /**
   * Get all pending items
   */
  getPending(): QueueItem[] {
    const stmt = this.db.prepare(
      `SELECT * FROM operation_queue WHERE status = 'pending' ORDER BY created_at ASC`
    )
    const items: QueueItem[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      items.push(this.mapRowToItem(row))
    }
    stmt.free()

    return items
  }

  /**
   * Get all items (for UI display)
   */
  getAll(): QueueItem[] {
    const stmt = this.db.prepare(`SELECT * FROM operation_queue ORDER BY created_at DESC`)
    const items: QueueItem[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      items.push(this.mapRowToItem(row))
    }
    stmt.free()

    return items
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM operation_queue WHERE status = 'pending'`)
    let count = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      count = row.count as number
    }
    stmt.free()
    return count
  }

  /**
   * Get failed count
   */
  getFailedCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM operation_queue WHERE status = 'failed'`)
    let count = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      count = row.count as number
    }
    stmt.free()
    return count
  }

  /**
   * Mark item as processing
   */
  markProcessing(id: string): void {
    this.db.run(`UPDATE operation_queue SET status = 'processing' WHERE id = ?`, [id])
    saveDb(this.db)
  }

  /**
   * Mark item as completed and remove
   */
  markComplete(id: string): void {
    this.db.run(`DELETE FROM operation_queue WHERE id = ?`, [id])
    saveDb(this.db)
    console.log(`[Queue] Completed: ${id}`)
  }

  /**
   * Increment retry count and mark error
   */
  markRetry(id: string, error: string): void {
    this.db.run(
      `UPDATE operation_queue SET 
        status = 'pending', 
        retry_count = retry_count + 1, 
        last_error = ? 
       WHERE id = ?`,
      [error, id]
    )
    saveDb(this.db)
    console.log(`[Queue] Retry scheduled: ${id} - ${error}`)
  }

  /**
   * Mark item as failed (max retries exceeded)
   */
  markFailed(id: string, error: string): void {
    this.db.run(
      `UPDATE operation_queue SET status = 'failed', last_error = ? WHERE id = ?`,
      [error, id]
    )
    saveDb(this.db)
    console.log(`[Queue] Failed: ${id} - ${error}`)
  }

  /**
   * Retry a failed item
   */
  retryFailed(id: string): void {
    this.db.run(
      `UPDATE operation_queue SET status = 'pending', last_error = NULL WHERE id = ?`,
      [id]
    )
    saveDb(this.db)
  }

  /**
   * Clear all completed/failed items
   */
  clearCompleted(): void {
    this.db.run(`DELETE FROM operation_queue WHERE status IN ('completed', 'failed')`)
    saveDb(this.db)
  }

  /**
   * Clear all items
   */
  clearAll(): void {
    this.db.run(`DELETE FROM operation_queue`)
    saveDb(this.db)
  }

  /**
   * Map database row to QueueItem
   */
  private mapRowToItem(row: Record<string, unknown>): QueueItem {
    return {
      id: row.id as string,
      action: row.action as QueueAction,
      entity: row.entity as string,
      payload: row.payload as string,
      createdAt: row.created_at as number,
      retryCount: row.retry_count as number,
      lastError: row.last_error as string | null,
      status: row.status as QueueStatus
    }
  }

  /**
   * Parse payload JSON
   */
  parsePayload(item: QueueItem): Record<string, unknown> {
    return JSON.parse(item.payload)
  }
}
