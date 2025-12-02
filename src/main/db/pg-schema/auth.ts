import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// AUTH: User, Role, Permission, UserRole, RolePermission

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  pin: text('pin'),
  storeId: text('store_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const roles = pgTable('role', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const permissions = pgTable('permission', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const userRoles = pgTable('user_role', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  roleId: text('role_id').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})

export const rolePermissions = pgTable('role_permission', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull(),
  permissionId: text('permission_id').notNull(),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})
