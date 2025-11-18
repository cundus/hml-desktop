import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

/**
 * SyncService - Handles bidirectional sync between local SQLite and cloud PostgreSQL
 *
 * Strategy: Delta Sync
 * - Only sync records that have changed since last sync
 * - Use syncedAt timestamp to track sync state
 * - Use deviceId to identify record origin
 * - Conflict resolution: Last write wins (based on updatedAt)
 */
export class SyncService {
  private localPrisma: PrismaClient
  private cloudPrisma: PrismaClient | null = null
  private deviceId: string

  constructor(localPrisma: PrismaClient, deviceId?: string) {
    this.localPrisma = localPrisma
    this.deviceId = deviceId || this.getOrCreateDeviceId()
  }

  /**
   * Initialize cloud connection
   */
  async initCloudConnection(cloudDatabaseUrl: string): Promise<void> {
    if (this.cloudPrisma) {
      await this.cloudPrisma.$disconnect()
    }

    this.cloudPrisma = new PrismaClient({
      datasources: {
        db: {
          url: cloudDatabaseUrl
        }
      }
    })

    await this.cloudPrisma.$connect()
  }

  /**
   * Get or create unique device ID
   */
  private getOrCreateDeviceId(): string {
    // In production, store this in electron-store or similar
    const stored = process.env.DEVICE_ID
    if (stored) return stored

    const newDeviceId = uuidv4()
    process.env.DEVICE_ID = newDeviceId
    return newDeviceId
  }

  /**
   * Check if cloud is connected
   */
  isCloudConnected(): boolean {
    return this.cloudPrisma !== null
  }

  /**
   * Full sync: Pull from cloud then push local changes
   */
  async fullSync(): Promise<SyncResult> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    const result: SyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date()
    }

    try {
      // Pull first (cloud → local)
      const pullResult = await this.pullFromCloud()
      result.pulled = pullResult.count
      result.conflicts += pullResult.conflicts

      // Then push (local → cloud)
      const pushResult = await this.pushToCloud()
      result.pushed = pushResult.count
      result.conflicts += pushResult.conflicts

      return result
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : String(error))
      return result
    }
  }

  /**
   * Pull data from cloud to local (only new/updated records)
   */
  async pullFromCloud(): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    let totalCount = 0
    let totalConflicts = 0

    // Define all syncable models
    const models = [
      'user',
      'role',
      'permission',
      'userRole',
      'rolePermission',
      'store',
      'customer',
      'customerCategory',
      'product',
      'category',
      'supplier',
      'productPrice',
      'batch',
      'productLocation',
      'stockTransaction',
      'stockAdjustment',
      'purchaseOrder',
      'purchaseOrderItem',
      'transferRequest',
      'transferItem',
      'transactions',
      'transactionItems',
      'auditLog'
    ]

    for (const modelName of models) {
      try {
        const result = await this.pullModelFromCloud(modelName)
        totalCount += result.count
        totalConflicts += result.conflicts
      } catch (error) {
        console.error(`Error pulling ${modelName}:`, error)
      }
    }

    return { count: totalCount, conflicts: totalConflicts }
  }

  /**
   * Pull specific model from cloud
   */
  private async pullModelFromCloud(
    modelName: string
  ): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    const cloudModel = (this.cloudPrisma as any)[modelName]
    const localModel = (this.localPrisma as any)[modelName]

    if (!cloudModel || !localModel) {
      console.warn(`Model ${modelName} not found`)
      return { count: 0, conflicts: 0 }
    }

    // Get last sync time for this device
    const lastSyncTime = await this.getLastSyncTime()

    // Fetch records from cloud that were updated after last sync
    // and were not created by this device
    const cloudRecords = await cloudModel.findMany({
      where: {
        OR: [{ updatedAt: { gt: lastSyncTime } }, { syncedAt: null }],
        deviceId: { not: this.deviceId }
      }
    })

    let count = 0
    let conflicts = 0

    for (const cloudRecord of cloudRecords) {
      try {
        // Check if record exists locally
        const localRecord = await localModel.findUnique({
          where: { id: cloudRecord.id }
        })

        if (!localRecord) {
          // New record - insert
          await localModel.create({
            data: {
              ...cloudRecord,
              syncedAt: new Date()
            }
          })
          count++
        } else {
          // Existing record - check for conflicts
          if (localRecord.updatedAt > cloudRecord.updatedAt) {
            // Local is newer - conflict (skip, will be pushed later)
            conflicts++
            continue
          }

          // Cloud is newer or same - update local
          await localModel.update({
            where: { id: cloudRecord.id },
            data: {
              ...cloudRecord,
              syncedAt: new Date()
            }
          })
          count++
        }
      } catch (error) {
        console.error(`Error syncing record ${cloudRecord.id}:`, error)
      }
    }

    return { count, conflicts }
  }

  /**
   * Push local data to cloud (only new/updated records)
   */
  async pushToCloud(): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    let totalCount = 0
    let totalConflicts = 0

    const models = [
      'user',
      'role',
      'permission',
      'userRole',
      'rolePermission',
      'store',
      'customer',
      'customerCategory',
      'product',
      'category',
      'supplier',
      'productPrice',
      'batch',
      'productLocation',
      'stockTransaction',
      'stockAdjustment',
      'purchaseOrder',
      'purchaseOrderItem',
      'transferRequest',
      'transferItem',
      'transactions',
      'transactionItems',
      'auditLog'
    ]

    for (const modelName of models) {
      try {
        const result = await this.pushModelToCloud(modelName)
        totalCount += result.count
        totalConflicts += result.conflicts
      } catch (error) {
        console.error(`Error pushing ${modelName}:`, error)
      }
    }

    return { count: totalCount, conflicts: totalConflicts }
  }

  /**
   * Push specific model to cloud
   */
  private async pushModelToCloud(modelName: string): Promise<{ count: number; conflicts: number }> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    const cloudModel = (this.cloudPrisma as any)[modelName]
    const localModel = (this.localPrisma as any)[modelName]

    if (!cloudModel || !localModel) {
      return { count: 0, conflicts: 0 }
    }

    // Get records that haven't been synced or were updated after last sync
    const localRecords = await localModel.findMany({
      where: {
        OR: [{ syncedAt: null }, { updatedAt: { gt: await this.getLastSyncTime() } }]
      }
    })

    let count = 0
    let conflicts = 0

    for (const localRecord of localRecords) {
      try {
        // Check if record exists in cloud
        const cloudRecord = await cloudModel.findUnique({
          where: { id: localRecord.id }
        })

        if (!cloudRecord) {
          // New record - insert to cloud
          await cloudModel.create({
            data: {
              ...localRecord,
              deviceId: this.deviceId,
              syncedAt: new Date()
            }
          })

          // Update local syncedAt
          await localModel.update({
            where: { id: localRecord.id },
            data: { syncedAt: new Date() }
          })
          count++
        } else {
          // Existing record - check for conflicts
          if (cloudRecord.updatedAt > localRecord.updatedAt) {
            // Cloud is newer - conflict (skip, already pulled)
            conflicts++
            continue
          }

          // Local is newer or same - update cloud
          await cloudModel.update({
            where: { id: localRecord.id },
            data: {
              ...localRecord,
              deviceId: this.deviceId,
              syncedAt: new Date()
            }
          })

          // Update local syncedAt
          await localModel.update({
            where: { id: localRecord.id },
            data: { syncedAt: new Date() }
          })
          count++
        }
      } catch (error) {
        console.error(`Error pushing record ${localRecord.id}:`, error)
      }
    }

    return { count, conflicts }
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTime(): Promise<Date> {
    // In production, store this in a sync_metadata table
    // For now, use a reasonable default (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return thirtyDaysAgo
  }

  /**
   * Initial sync on first app launch
   */
  async initialSync(): Promise<SyncResult> {
    if (!this.cloudPrisma) {
      throw new Error('Cloud connection not initialized')
    }

    const result: SyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date()
    }

    try {
      // On first launch, only pull from cloud
      const pullResult = await this.pullFromCloud()
      result.pulled = pullResult.count
      result.conflicts = pullResult.conflicts

      return result
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : String(error))
      return result
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const unsyncedCount = await this.getUnsyncedRecordsCount()
    const lastSync = await this.getLastSyncTime()

    return {
      isCloudConnected: this.isCloudConnected(),
      lastSyncTime: lastSync,
      unsyncedRecordsCount: unsyncedCount,
      deviceId: this.deviceId
    }
  }

  /**
   * Get count of unsynced records
   */
  private async getUnsyncedRecordsCount(): Promise<number> {
    let count = 0

    const models = ['user', 'role', 'permission', 'product', 'category', 'customer', 'store']

    for (const modelName of models) {
      try {
        const model = (this.localPrisma as any)[modelName]
        if (model) {
          const unsynced = await model.count({
            where: {
              OR: [{ syncedAt: null }, { updatedAt: { gt: await this.getLastSyncTime() } }]
            }
          })
          count += unsynced
        }
      } catch (error) {
        console.error(`Error counting unsynced ${modelName}:`, error)
      }
    }

    return count
  }

  /**
   * Disconnect cloud connection
   */
  async disconnect(): Promise<void> {
    if (this.cloudPrisma) {
      await this.cloudPrisma.$disconnect()
      this.cloudPrisma = null
    }
  }
}

// Types
export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: Date
}

export interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: Date
  unsyncedRecordsCount: number
  deviceId: string
}
