import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

////////////////////////////////////////////////////
// AUDIT LOG
// System audit trail
////////////////////////////////////////////////////

export const auditLogs = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: text('action').notNull(),
  userId: text('user_id').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deviceId: text('device_id'),
})

// Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  // user: one(users, ...),
}))

// Types
export type AuditLog = typeof auditLogs.$inferSelect
