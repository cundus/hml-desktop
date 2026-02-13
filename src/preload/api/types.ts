// Common types used across all API modules

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Base entity fields
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

// Sync types
export interface EntitySyncStats {
  pulled: number
  pushed: number
  conflicts: number
}

export interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: Date | null
  unsyncedRecordsCount: number
  deviceId: string
  isSyncing: boolean
}

export interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: Date
  byEntity?: Record<string, EntitySyncStats>
}
