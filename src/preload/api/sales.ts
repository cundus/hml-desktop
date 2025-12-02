import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  quantity: number
  price: string
  createdAt: Date
  updatedAt: Date
}

export interface Transaction extends BaseEntity {
  code: string
  storeId: string
  subtotal: string
  discount: string
  tax: string
  total: string
  customerId: string | null
  userId: string | null
  deviceId: string | null
  items?: TransactionItem[]
}

export interface SalesSummary {
  totalTransactions: number
  totalRevenue: string
  totalDiscount: string
  totalTax: string
}

export interface DashboardStats {
  todayRevenue: number
  todayTransactions: number
  weekRevenue: number
  weekTransactions: number
  monthRevenue: number
  monthTransactions: number
  totalProducts: number
  totalCustomers: number
  lowStockCount: number
}

// Transaction API
export const transactionApi = {
  getAll: () => ipcRenderer.invoke('db:transactions:getAll') as Promise<ApiResponse<Transaction[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:transactions:getById', id) as Promise<ApiResponse<Transaction>>,

  getByCode: (code: string) =>
    ipcRenderer.invoke('db:transactions:getByCode', code) as Promise<ApiResponse<Transaction>>,

  getByStoreId: (storeId: string) =>
    ipcRenderer.invoke('db:transactions:getByStoreId', storeId) as Promise<
      ApiResponse<Transaction[]>
    >,

  getByCustomerId: (customerId: string) =>
    ipcRenderer.invoke('db:transactions:getByCustomerId', customerId) as Promise<
      ApiResponse<Transaction[]>
    >,

  getByUserId: (userId: string) =>
    ipcRenderer.invoke('db:transactions:getByUserId', userId) as Promise<
      ApiResponse<Transaction[]>
    >,

  create: (data: {
    code: string
    storeId: string
    subtotal: string
    discount?: string
    tax?: string
    total: string
    customerId?: string
    userId?: string
    items: {
      productId: string
      quantity: number
      price: string
    }[]
  }) => ipcRenderer.invoke('db:transactions:create', data) as Promise<ApiResponse<Transaction>>,

  getSalesSummary: (storeId: string, startDate?: string, endDate?: string) =>
    ipcRenderer.invoke('db:transactions:getSalesSummary', storeId, startDate, endDate) as Promise<
      ApiResponse<SalesSummary>
    >,

  delete: (id: string) =>
    ipcRenderer.invoke('db:transactions:delete', id) as Promise<ApiResponse<Transaction>>,

  restore: (id: string) =>
    ipcRenderer.invoke('db:transactions:restore', id) as Promise<ApiResponse<Transaction>>,

  getDashboardStats: () =>
    ipcRenderer.invoke('db:transactions:getDashboardStats') as Promise<ApiResponse<DashboardStats>>
}
