import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// AUDIT: AuditLog

export const auditLogs = pgTable('audit_log', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  userId: text('user_id').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})
