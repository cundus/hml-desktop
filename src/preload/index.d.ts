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
    getAll: () => Promise<ApiResponse<User[]>>
    getById: (id: string) => Promise<ApiResponse<User>>
    create: (data: { name: string; email: string; password: string }) => Promise<ApiResponse<User>>
    update: (id: string, data: { name?: string; email?: string }) => Promise<ApiResponse<User>>
    softDelete: (id: string) => Promise<ApiResponse<User>>
  }
  products: {
    getAll: () => Promise<ApiResponse<Product[]>>
    getById: (id: string) => Promise<ApiResponse<Product>>
    create: (data: {
      sku: string
      name: string
      description?: string
      unit: string
      cost: number
      categoryId?: string
    }) => Promise<ApiResponse<Product>>
    update: (
      id: string,
      data: {
        name?: string
        description?: string
        cost?: number
        isActive?: boolean
      }
    ) => Promise<ApiResponse<Product>>
    softDelete: (id: string) => Promise<ApiResponse<Product>>
  }
  categories: {
    getAll: () => Promise<ApiResponse<any[]>>
    getById: (id: string) => Promise<ApiResponse<any>>
    create: (data: { name: string }) => Promise<ApiResponse<any>>
    update: (id: string, data: { name?: string }) => Promise<ApiResponse<any>>
    softDelete: (id: string) => Promise<ApiResponse<any>>
    restore: (id: string) => Promise<ApiResponse<any>>
  }
  suppliers: {
    getAll: () => Promise<ApiResponse<any[]>>
    getById: (id: string) => Promise<ApiResponse<any>>
    create: (data: { name: string; phone?: string; address?: string }) => Promise<ApiResponse<any>>
    update: (id: string, data: { name?: string; phone?: string; address?: string }) => Promise<ApiResponse<any>>
    softDelete: (id: string) => Promise<ApiResponse<any>>
    restore: (id: string) => Promise<ApiResponse<any>>
  }
  stores: {
    getAll: () => Promise<ApiResponse<any[]>>
    getById: (id: string) => Promise<ApiResponse<any>>
    getByCode: (code: string) => Promise<ApiResponse<any>>
    create: (data: { code: string; name: string; address?: string; type: string }) => Promise<ApiResponse<any>>
    update: (id: string, data: { code?: string; name?: string; address?: string; type?: string }) => Promise<ApiResponse<any>>
    softDelete: (id: string) => Promise<ApiResponse<any>>
    restore: (id: string) => Promise<ApiResponse<any>>
  }
  customerCategories: {
    getAll: () => Promise<ApiResponse<any[]>>
    getById: (id: string) => Promise<ApiResponse<any>>
    create: (data: { name: string }) => Promise<ApiResponse<any>>
    update: (id: string, data: { name?: string }) => Promise<ApiResponse<any>>
    softDelete: (id: string) => Promise<ApiResponse<any>>
    restore: (id: string) => Promise<ApiResponse<any>>
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

export interface API {
  openMasterCustomerWindow: () => void
  db: DatabaseAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
