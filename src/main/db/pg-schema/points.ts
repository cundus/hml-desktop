import { pgTable, text, integer, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'

// POINTS: Point Settings, Point History

/**
 * Point Settings - Configurable rewards program settings
 */
export const pointSettings = pgTable('point_setting', {
  id: text('id').primaryKey(),

  // Earning rules
  pointPerRupiah: numeric('point_per_rupiah').notNull().default('0.01'), // 1 point per Rp100
  minTransaction: numeric('min_transaction').notNull().default('0'), // Min transaction to earn

  // Redemption rules
  redemptionValue: numeric('redemption_value').notNull().default('10'), // 1 point = Rp10
  minRedemption: integer('min_redemption').notNull().default(100), // Min points to redeem
  maxRedemptionPercent: integer('max_redemption_percent').notNull().default(50), // Max 50% of total

  // Expiry rules
  expiryMonths: integer('expiry_months').notNull().default(12), // 0 = never expires

  // Toggle
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false })
})

/**
 * Point History - Audit log for all point transactions
 */
export const pointHistories = pgTable('point_history', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  transactionId: text('transaction_id'), // NULL for manual adjustments

  type: text('type').notNull(), // 'EARN', 'REDEEM', 'EXPIRE', 'ADJUST'
  points: integer('points').notNull(), // Positive for earn, negative for redeem
  balanceAfter: integer('balance_after').notNull(), // Running balance

  notes: text('notes'),
  expiresAt: timestamp('expires_at', { withTimezone: false }), // When these points expire

  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: false }),
  deletedAt: timestamp('deleted_at', { withTimezone: false }),
  deviceId: text('device_id')
})
