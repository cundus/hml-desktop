import { randomUUID } from 'crypto'
import { desc, eq, and, gte, lte, isNull, sql } from 'drizzle-orm'
import { getCloudDb } from './cloud-db.service'
import { auditLogs } from '../db/pg-schema'

// Action types for audit logging
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'IMPORT'
  | 'EXPORT'
  | 'TOGGLE_ACTIVE'
  | 'PRICE_CHANGE'
  | 'STOCK_ADJUSTMENT'
  | 'SHIFT_OPEN'
  | 'SHIFT_CLOSE'
  | 'PAYMENT'
  | 'REFUND'
  | 'VOID'

// Entity types that can be audited
export type AuditEntityType =
  | 'product'
  | 'category'
  | 'supplier'
  | 'customer'
  | 'transaction'
  | 'expense'
  | 'user'
  | 'role'
  | 'store'
  | 'shift'
  | 'stock'
  | 'price'
  | 'batch'
  | 'purchase_order'
  | 'delivery_order'
  | 'payment_method'
  | 'permission'
  | 'config'
  | 'system'

export interface AuditLogEntry {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  userId: string
  userName?: string
  storeId?: string
  storeName?: string
  deviceId?: string
  oldValues?: object | null
  newValues?: object | null
  metadata?: object | null
}

export interface AuditLogFilters {
  startDate?: Date
  endDate?: Date
  action?: AuditAction
  entityType?: AuditEntityType
  userId?: string
  storeId?: string
  limit?: number
  offset?: number
}

export interface AuditLogRecord {
  id: string
  action: string
  entityType: string
  entityId: string | null
  userId: string
  userName: string | null
  storeId: string | null
  storeName: string | null
  deviceId: string | null
  oldValues: object | null
  newValues: object | null
  metadata: object | null
  createdAt: Date
}

/**
 * AuditLogService - Centralized service for logging all user actions
 * Can be called from any controller with a single line of code
 */
export class AuditLogService {
  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<string> {
    try {
      const db = getCloudDb().getDb()
      const id = randomUUID()

      await db.insert(auditLogs).values({
        id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        userId: entry.userId,
        userName: entry.userName || null,
        storeId: entry.storeId || null,
        storeName: entry.storeName || null,
        deviceId: entry.deviceId || null,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        createdAt: new Date()
      })

      return id
    } catch (error) {
      // Log errors but don't throw - audit logging should not break main operations
      console.error('[AuditLog] Failed to log entry:', error)
      return ''
    }
  }

  /**
   * Get all audit logs with optional filters
   */
  async getAll(filters: AuditLogFilters = {}): Promise<AuditLogRecord[]> {
    const db = getCloudDb().getDb()
    const conditions: ReturnType<typeof eq>[] = []

    // Add filter conditions
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action))
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType))
    }
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId))
    }
    if (filters.storeId) {
      conditions.push(eq(auditLogs.storeId, filters.storeId))
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate))
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate))
    }

    // Always exclude soft-deleted records
    conditions.push(isNull(auditLogs.deletedAt))

    const limit = filters.limit || 100
    const offset = filters.offset || 0

    const results = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)

    return results.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      userId: row.userId,
      userName: row.userName,
      storeId: row.storeId,
      storeName: row.storeName,
      deviceId: row.deviceId,
      oldValues: row.oldValues ? JSON.parse(row.oldValues) : null,
      newValues: row.newValues ? JSON.parse(row.newValues) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.createdAt
    }))
  }

  /**
   * Get total count of audit logs matching filters
   */
  async getCount(filters: AuditLogFilters = {}): Promise<number> {
    const db = getCloudDb().getDb()
    const conditions: ReturnType<typeof eq>[] = []

    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action))
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType))
    }
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId))
    }
    if (filters.storeId) {
      conditions.push(eq(auditLogs.storeId, filters.storeId))
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate))
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate))
    }
    conditions.push(isNull(auditLogs.deletedAt))

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions))

    return result[0]?.count || 0
  }

  /**
   * Cleanup old audit logs based on retention policy
   * @param retentionDays Number of days to retain logs
   * @returns Number of deleted records
   */
  async cleanup(retentionDays: number): Promise<number> {
    const db = getCloudDb().getDb()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, cutoffDate))
      .returning({ id: auditLogs.id })

    console.log(`[AuditLog] Cleanup: Deleted ${result.length} records older than ${retentionDays} days`)
    return result.length
  }
}
