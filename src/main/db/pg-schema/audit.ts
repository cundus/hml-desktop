import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// AUDIT: AuditLog - Comprehensive audit trail for all user actions

export const auditLogs = pgTable('audit_log', {
  id: text('id').primaryKey(),
  
  // Action details
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  entityType: text('entity_type').notNull(), // product, transaction, user, etc.
  entityId: text('entity_id'), // ID of the affected record (nullable for login/logout)
  
  // Context
  userId: text('user_id').notNull(), // User who performed the action
  userName: text('user_name'), // Denormalized for quick display
  storeId: text('store_id'), // Store context (nullable for global actions)
  storeName: text('store_name'), // Denormalized for quick display
  deviceId: text('device_id'), // Device identifier
  
  // Change tracking
  oldValues: text('old_values'), // JSON stringified before-state
  newValues: text('new_values'), // JSON stringified after-state
  metadata: text('metadata'), // Additional context (e.g., IP, browser, reason)
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})
