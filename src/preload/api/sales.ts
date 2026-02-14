import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  quantity: number
  price: string
  displayQuantity?: number
  uomCode?: string
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
  paymentMethod: string
  paymentDeadline: Date | null
  receiptPrinted: boolean
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
    paymentMethod?: string
    paymentDeadline?: Date
    receiptPrinted?: boolean
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

  update: (
    id: string,
    data: {
      subtotal?: string
      discount?: string
      tax?: string
      total?: string
      paymentMethod?: string
      paymentDeadline?: Date | null
      customerId?: string | null
      items?: {
        id?: string
        productId: string
        quantity: number
        price: string
      }[]
    }
  ) => ipcRenderer.invoke('db:transactions:update', id, data) as Promise<ApiResponse<Transaction>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:transactions:delete', id) as Promise<ApiResponse<Transaction>>,

  restore: (id: string) =>
    ipcRenderer.invoke('db:transactions:restore', id) as Promise<ApiResponse<Transaction>>,

  getDashboardStats: (storeId?: string) =>
    ipcRenderer.invoke('db:transactions:getDashboardStats', storeId) as Promise<ApiResponse<DashboardStats>>,

  printReceipt: (transaction: Transaction) =>
    ipcRenderer.invoke('receipt:print', transaction) as Promise<
      ApiResponse<{ success: boolean; error?: string }>
    >,

  updateReceiptPrinted: (transactionId: string, printed: boolean) =>
    ipcRenderer.invoke('db:transactions:updateReceiptPrinted', transactionId, printed) as Promise<
      ApiResponse<Transaction>
    >,
  
  getProfitLossReport: (startDate: string, endDate: string, storeId?: string) =>
    ipcRenderer.invoke(
      'db:transactions:getProfitLossReport',
      startDate,
      endDate,
      storeId
    ) as Promise<ApiResponse<{
      revenue: number
      cogs: number
      grossProfit: number
      margin: number
      totalTransactions: number
      brokenGoods: number
    }>>,

  getByDateRange: (startDate: string, endDate: string, storeId?: string) =>
    ipcRenderer.invoke(
      'db:transactions:getByDateRange',
      startDate,
      endDate,
      storeId
    ) as Promise<ApiResponse<Transaction[]>>,

  getBrokenGoodsSummary: (startDate: string, endDate: string, storeId?: string) => 
    ipcRenderer.invoke(
      'db:transactions:getBrokenGoodsSummary',
      startDate,
      endDate,
      storeId
    ) as Promise<ApiResponse<number>>,

  getTopProducts: (limit?: number, storeId?: string) =>
    ipcRenderer.invoke('db:transactions:getTopProducts', limit, storeId) as Promise<ApiResponse<{
      rank: number
      name: string
      sku: string
      category: string
      units: number
      revenue: number
    }[]>>,

  getDashboardAlerts: (storeId?: string) =>
    ipcRenderer.invoke('db:transactions:getDashboardAlerts', storeId) as Promise<ApiResponse<{
      lowStock: { name: string; onHand: number; reorderPoint: number; severity: string }[]
      pendingReturns: { code: string; items: number; days: number }[]
      unpaidInvoices: { code: string; amount: string; status: string }[]
    }>>,

  getProfitDetail: (transactionId: string) =>
    ipcRenderer.invoke('db:transactions:getProfitDetail', transactionId) as Promise<ApiResponse<{
      id: string
      productId: string
      productName: string
      uomCode: string | null
      quantity: number
      sellPrice: number
      subtotal: number
      cogsUnit: number
      cogsTotal: number
      profitUnit: number
      profitTotal: number
      margin: number
    }[]>>
}
