import { Database } from 'sql.js'
import { saveDb } from '../localDb'
import { randomUUID } from 'crypto'

export interface AppConfig {
  id: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface DeviceConfig {
  deviceId: string
  branchId: string | null
  branchName: string | null
  headBranchId: string | null
  headBranchName: string | null
  isHeadBranch: boolean
  cloudDbUrl: string | null
  managerId: string | null
  managerName: string | null
  isConfigured: boolean
}

const CONFIG_KEYS = {
  DEVICE_ID: 'device_id',
  BRANCH_ID: 'branch_id',
  BRANCH_NAME: 'branch_name',
  HEAD_BRANCH_ID: 'head_branch_id',
  HEAD_BRANCH_NAME: 'head_branch_name',
  IS_HEAD_BRANCH: 'is_head_branch',
  CLOUD_DB_URL: 'cloud_db_url',
  MANAGER_ID: 'manager_id',
  MANAGER_NAME: 'manager_name',
  IS_CONFIGURED: 'is_configured',
  // Feature flags
  ENABLE_MULTI_UOM_PRICING: 'enable_multi_uom_pricing'
}

export class AppConfigService {
  constructor(private db: Database) {
    this.ensureConfigTable()
  }

  /**
   * Ensure app_config table exists
   */
  private ensureConfigTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS app_config (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `)
    saveDb(this.db)
  }

  /**
   * Get a config value by key
   */
  async get(key: string): Promise<string | null> {
    const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?')
    stmt.bind([key])

    let value: string | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject()
      value = row.value as string | null
    }
    stmt.free()

    return value
  }

  /**
   * Set a config value
   */
  async set(key: string, value: string | null): Promise<void> {
    const existing = await this.get(key)
    const now = Date.now()

    if (existing !== null) {
      this.db.run('UPDATE app_config SET value = ?, updated_at = ? WHERE key = ?', [
        value,
        now,
        key
      ])
    } else {
      const id = randomUUID()
      this.db.run(
        'INSERT INTO app_config (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, key, value, now, now]
      )
    }
    saveDb(this.db)
  }

  /**
   * Get full device configuration
   */
  async getDeviceConfig(): Promise<DeviceConfig> {
    const deviceId = (await this.get(CONFIG_KEYS.DEVICE_ID)) || randomUUID()
    const branchId = await this.get(CONFIG_KEYS.BRANCH_ID)
    const branchName = await this.get(CONFIG_KEYS.BRANCH_NAME)
    const headBranchId = await this.get(CONFIG_KEYS.HEAD_BRANCH_ID)
    const headBranchName = await this.get(CONFIG_KEYS.HEAD_BRANCH_NAME)
    const isHeadBranch = (await this.get(CONFIG_KEYS.IS_HEAD_BRANCH)) === 'true'
    const cloudDbUrl = await this.get(CONFIG_KEYS.CLOUD_DB_URL)
    const managerId = await this.get(CONFIG_KEYS.MANAGER_ID)
    const managerName = await this.get(CONFIG_KEYS.MANAGER_NAME)
    const isConfigured = (await this.get(CONFIG_KEYS.IS_CONFIGURED)) === 'true'

    // Ensure device ID is saved
    if (!(await this.get(CONFIG_KEYS.DEVICE_ID))) {
      await this.set(CONFIG_KEYS.DEVICE_ID, deviceId)
    }

    return {
      deviceId,
      branchId,
      branchName,
      headBranchId,
      headBranchName,
      isHeadBranch,
      cloudDbUrl,
      managerId,
      managerName,
      isConfigured
    }
  }

  /**
   * Setup initial device configuration
   */
  async setupDevice(config: {
    branchId: string
    branchName: string
    headBranchId?: string
    headBranchName?: string
    isHeadBranch: boolean
    cloudDbUrl?: string
    managerId?: string
    managerName?: string
  }): Promise<DeviceConfig> {
    await this.set(CONFIG_KEYS.BRANCH_ID, config.branchId)
    await this.set(CONFIG_KEYS.BRANCH_NAME, config.branchName)
    await this.set(CONFIG_KEYS.HEAD_BRANCH_ID, config.headBranchId || config.branchId)
    await this.set(CONFIG_KEYS.HEAD_BRANCH_NAME, config.headBranchName || config.branchName)
    await this.set(CONFIG_KEYS.IS_HEAD_BRANCH, config.isHeadBranch ? 'true' : 'false')
    if (config.cloudDbUrl) {
      await this.set(CONFIG_KEYS.CLOUD_DB_URL, config.cloudDbUrl)
    }
    if (config.managerId) {
      await this.set(CONFIG_KEYS.MANAGER_ID, config.managerId)
    }
    if (config.managerName) {
      await this.set(CONFIG_KEYS.MANAGER_NAME, config.managerName)
    }
    await this.set(CONFIG_KEYS.IS_CONFIGURED, 'true')

    return this.getDeviceConfig()
  }

  /**
   * Update cloud database URL
   */
  async setCloudDbUrl(url: string): Promise<void> {
    await this.set(CONFIG_KEYS.CLOUD_DB_URL, url)
  }

  /**
   * Check if device is configured
   */
  async isConfigured(): Promise<boolean> {
    return (await this.get(CONFIG_KEYS.IS_CONFIGURED)) === 'true'
  }

  /**
   * Reset device configuration (for testing/re-setup)
   */
  async resetConfig(): Promise<void> {
    const keys = Object.values(CONFIG_KEYS).filter((k) => k !== CONFIG_KEYS.DEVICE_ID)
    for (const key of keys) {
      this.db.run('DELETE FROM app_config WHERE key = ?', [key])
    }
    saveDb(this.db)
  }

  /**
   * Get branch ID for filtering queries
   * Returns null if user is top-level (head branch) or no branch configured
   */
  async getBranchIdForFiltering(): Promise<string | null> {
    const config = await this.getDeviceConfig()
    // If this is head branch, don't filter by branch
    if (config.isHeadBranch) {
      return null
    }
    return config.branchId
  }

  // ============ Feature Flags ============

  /**
   * Check if multi-UOM pricing feature is enabled
   * Defaults to true for new installations
   */
  async isMultiUomPricingEnabled(): Promise<boolean> {
    const value = await this.get(CONFIG_KEYS.ENABLE_MULTI_UOM_PRICING)
    // Default to true if not set (new installations)
    return value === null || value === 'true'
  }

  /**
   * Enable or disable multi-UOM pricing feature
   */
  async setMultiUomPricingEnabled(enabled: boolean): Promise<void> {
    await this.set(CONFIG_KEYS.ENABLE_MULTI_UOM_PRICING, enabled ? 'true' : 'false')
  }

  /**
   * Get all feature flags
   */
  async getFeatureFlags(): Promise<{ enableMultiUomPricing: boolean }> {
    return {
      enableMultiUomPricing: await this.isMultiUomPricingEnabled()
    }
  }

  /**
   * Reset all transactional data (Factory Reset - Data Only)
   * Keeps users, roles, and master data (products, suppliers, etc.)
   */
  async resetData(): Promise<void> {
    try {
      this.db.exec('BEGIN TRANSACTION')

      // Inventory
      this.db.exec('DELETE FROM stock_transaction')
      this.db.exec('DELETE FROM product_location')
      this.db.exec('DELETE FROM stock_adjustment')

      // Purchasing
      this.db.exec('DELETE FROM purchase_order_item')
      this.db.exec('DELETE FROM purchase_order')

      // Sales
      this.db.exec('DELETE FROM transaction_items')
      this.db.exec('DELETE FROM transactions')

      // Operations
      this.db.exec('DELETE FROM expenses')
      this.db.exec('DELETE FROM shift_history')
      this.db.exec('DELETE FROM cashier_shift')

      // Optional: Reset sequences for these tables if using AUTOINCREMENT (mostly UUIDs here, so ok)
      // cleaning sqlite_sequence is good practice if any integer IDs are used and reset is desired
      this.db.exec(
        "DELETE FROM sqlite_sequence WHERE name IN ('stock_transaction', 'product_location', 'stock_adjustment', 'purchase_order', 'purchase_order_item', 'transaction_items', 'transactions', 'expenses', 'shift_history', 'cashier_shift')"
      )

      this.db.exec('COMMIT')
      saveDb(this.db)
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}
