import { ElectronAPI } from '@electron-toolkit/preload'

type User = {
  id: string
  name: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
  deviceId: string | null
  storeId: string | null
}

type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  unit: string
  cost: number
  isActive: boolean
  categoryId: string | null
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: string
  unsyncedRecordsCount: number
  deviceId: string
}

interface SyncResult {
  success: boolean
  pulled: number
  pushed: number
  conflicts: number
  errors: string[]
  timestamp: string
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface DatabaseAPI {
  users: {
    getAll: () => Promise<User[]>
    getById: (id: string) => Promise<User | null>
    create: (data: { name: string; email: string; password: string }) => Promise<User>
    update: (id: string, data: { name?: string; email?: string }) => Promise<User>
    softDelete: (id: string) => Promise<User>
  }
  products: {
    getAll: () => Promise<Product[]>
    getById: (id: string) => Promise<Product | null>
    create: (data: {
      sku: string
      name: string
      description?: string
      unit: string
      cost: number
      categoryId?: string
    }) => Promise<Product>
    update: (
      id: string,
      data: {
        name?: string
        description?: string
        cost?: number
        isActive?: boolean
      }
    ) => Promise<Product>
    softDelete: (id: string) => Promise<Product>
  }
  sync: {
    connect: (cloudDatabaseUrl: string) => Promise<ApiResponse<boolean>>
    disconnect: () => Promise<ApiResponse<boolean>>
    fullSync: () => Promise<ApiResponse<SyncResult>>
    pull: () => Promise<ApiResponse<SyncResult>>
    push: () => Promise<ApiResponse<SyncResult>>
    initialSync: () => Promise<ApiResponse<SyncResult>>
    getStatus: () => Promise<ApiResponse<SyncStatus>>
  }
}

interface API {
  openMasterCustomerWindow: () => void
  db: DatabaseAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
