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
  groupId?: string
  priority: number
}

export interface QueueGroup {
  groupId: string
  items: QueueItem[]
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
    // Original table creation
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

    // Add new columns if they don't exist
    try {
      this.db.run(`ALTER TABLE operation_queue ADD COLUMN group_id TEXT`)
    } catch {
      // Column likely exists
    }

    try {
      this.db.run(`ALTER TABLE operation_queue ADD COLUMN priority INTEGER DEFAULT 0`)
    } catch {
      // Column likely exists
    }

    saveDb(this.db)
  }

  /**
   * Add operation to queue
   */
  async add(
    action: QueueAction,
    entity: string,
    payload: Record<string, unknown>,
    priority: number = 0,
    groupId?: string,
    save: boolean = true
  ): Promise<string> {
    const id = randomUUID()
    const now = Date.now()
    const payloadJson = JSON.stringify(payload)

    this.db.run(
      `INSERT INTO operation_queue (id, action, entity, payload, created_at, retry_count, status, priority, group_id) 
       VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
      [id, action, entity, payloadJson, now, priority, groupId ?? null]
    )
    
    if (save) {
      saveDb(this.db)
    }

    console.log(`[Queue] Added: ${action} ${entity} (${id})`)
    return id
  }



  /**
   * Add batch of operations to queue (grouped)
   */
  async addBatch(
    groupId: string,
    items: {
      action: QueueAction
      entity: string
      payload: Record<string, unknown>
      priority?: number
    }[],
    save: boolean = true
  ): Promise<string[]> {
    const now = Date.now()
    const ids: string[] = []

    // Sanitize groupId for savepoint name (remove dashes)
    const savepointName = `sp_${groupId.replace(/-/g, '_')}`
    
    this.db.run(`SAVEPOINT ${savepointName}`)

    try {
      for (const item of items) {
        const id = randomUUID()
        ids.push(id)
        const payloadJson = JSON.stringify(item.payload)
        const priority = item.priority ?? 0

        this.db.run(
          `INSERT INTO operation_queue (id, action, entity, payload, created_at, retry_count, status, group_id, priority) 
           VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)`,
          [id, item.action, item.entity, payloadJson, now, groupId, priority]
        )
      }
      this.db.run(`RELEASE SAVEPOINT ${savepointName}`)
      
      if (save) {
        saveDb(this.db)
      }
      
      console.log(`[Queue] Added batch group: ${groupId} (${items.length} items)`)
      return ids
    } catch (error) {
      this.db.run(`ROLLBACK TO SAVEPOINT ${savepointName}`)
      throw error
    }
  }

  /**
   * Get all pending items (ungrouped or all)
   */
  getPending(): QueueItem[] {
    const stmt = this.db.prepare(
      `SELECT * FROM operation_queue WHERE status = 'pending' ORDER BY priority ASC, created_at ASC`
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
   * Get pending groups
   */
  getPendingGroups(): QueueGroup[] {
    // Get all pending items that have a group_id
    const stmt = this.db.prepare(
      `SELECT * FROM operation_queue WHERE status = 'pending' AND group_id IS NOT NULL ORDER BY created_at ASC`
    )
    const groupsMap = new Map<string, QueueItem[]>()

    while (stmt.step()) {
      const row = stmt.getAsObject()
      const item = this.mapRowToItem(row)
      if (item.groupId) {
        if (!groupsMap.has(item.groupId)) {
          groupsMap.set(item.groupId, [])
        }
        groupsMap.get(item.groupId)!.push(item)
      }
    }
    stmt.free()

    const groups: QueueGroup[] = []
    for (const [groupId, items] of groupsMap.entries()) {
      // Sort items by priority within group
      items.sort((a, b) => a.priority - b.priority)
      groups.push({ groupId, items })
    }

    return groups
  }

  /**
   * Get pending count for specific entity (used to skip sync pull)
   */
  getPendingForEntity(entity: string): number {
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM operation_queue WHERE entity = ? AND status IN ('pending', 'processing')`
    )
    stmt.bind([entity])
    let count = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      count = row.count as number
    }
    stmt.free()
    return count
  }

  /**
   * Recover stale 'processing' items (e.g. after crash)
   */
  recoverStaleProcessing(): number {
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM operation_queue WHERE status = 'processing'`
    )
    let count = 0
    if (stmt.step()) {
      const row = stmt.getAsObject()
      count = row.count as number
    }
    stmt.free()

    if (count > 0) {
      this.db.run(`UPDATE operation_queue SET status = 'pending' WHERE status = 'processing'`)
      saveDb(this.db)
      console.log(`[Queue] Recovered ${count} stale processing items`)
    }

    return count
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
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM operation_queue WHERE status = 'pending'`
    )
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
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM operation_queue WHERE status = 'failed'`
    )
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
   * Mark group as processing
   */
  markGroupProcessing(groupId: string): void {
    this.db.run(`UPDATE operation_queue SET status = 'processing' WHERE group_id = ?`, [groupId])
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
   * Mark group as completed and remove
   */
  markGroupComplete(groupId: string): void {
    this.db.run(`DELETE FROM operation_queue WHERE group_id = ?`, [groupId])
    saveDb(this.db)
    console.log(`[Queue] Completed group: ${groupId}`)
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
   * Increment retry count and mark error for group
   */
  markGroupRetry(groupId: string, error: string): void {
    this.db.run(
      `UPDATE operation_queue SET 
        status = 'pending', 
        retry_count = retry_count + 1, 
        last_error = ? 
       WHERE group_id = ?`,
      [error, groupId]
    )
    saveDb(this.db)
    console.log(`[Queue] Retry scheduled group: ${groupId} - ${error}`)
  }

  /**
   * Mark item as failed (max retries exceeded)
   */
  markFailed(id: string, error: string): void {
    this.db.run(`UPDATE operation_queue SET status = 'failed', last_error = ? WHERE id = ?`, [
      error,
      id
    ])
    saveDb(this.db)
    console.log(`[Queue] Failed: ${id} - ${error}`)
  }

  /**
   * Mark group as failed (max retries exceeded)
   */
  markGroupFailed(groupId: string, error: string): void {
    this.db.run(`UPDATE operation_queue SET status = 'failed', last_error = ? WHERE group_id = ?`, [
      error,
      groupId
    ])
    saveDb(this.db)
    console.log(`[Queue] Failed group: ${groupId} - ${error}`)
  }

  /**
   * Retry a failed item
   */
  retryFailed(id: string): void {
    this.db.run(`UPDATE operation_queue SET status = 'pending', last_error = NULL WHERE id = ?`, [
      id
    ])
    saveDb(this.db)
  }

  /**
   * Retry failed group
   */
  retryFailedGroup(groupId: string): void {
    this.db.run(
      `UPDATE operation_queue SET status = 'pending', last_error = NULL WHERE group_id = ?`,
      [groupId]
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
      status: row.status as QueueStatus,
      groupId: row.group_id as string | undefined,
      priority: (row.priority as number) || 0
    }
  }

  /**
   * Parse payload JSON
   */
  parsePayload(item: QueueItem): Record<string, unknown> {
    return JSON.parse(item.payload)
  }
}
