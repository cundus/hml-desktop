import { ipcRenderer } from 'electron'

// Printer config types (mirrored from main/services/receipt.service.ts)
interface ReceiptConfig {
  printerName?: string
  paperWidth: number
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
}

interface ExpenseReportData {
  date: string
  shiftId: string
  shiftName: string
  expenses: Array<{
    item: string
    quantity: number
    price: string
    total: string
    description?: string
  }>
  totalExpenses: number
  expenseCount: number
}

// Export all API modules
export * from './types'
export * from './master-data'
export * from './core'
export * from './inventory'
export * from './pricing'
export * from './sales'
export * from './purchasing'
export * from './expenses'
export * from './sync'
export * from './shift'
export * from './app-config'

// Import Transaction type for receipt API
import { Transaction } from './sales'

// Re-export for convenience
import {
  categoryApi,
  supplierApi,
  storeApi,
  customerCategoryApi,
  customerApi,
  uomApi
} from './master-data'
import {
  userApi,
  productApi,
  roleApi,
  userRoleApi,
  permissionApi,
  rolePermissionApi,
  authApi
} from './core'
import {
  productPriceApi,
  productLocationApi,
  batchApi,
  stockTransactionApi,
  inventoryApi
} from './inventory'
import { transactionApi } from './sales'
import { purchaseOrderApi } from './purchasing'
import { expenseApi } from './expenses'
import { syncApi } from './sync'
import { shiftApi } from './shift'
import { appConfigApi } from './app-config'
import { pricingApi } from './pricing'
import { priceCategoryApi } from './price-category'
import { printerConfigApi } from './printer-config'
import { deliveryOrderApi } from './delivery-order'
import { paymentMethodApi } from './payment-method'
import { salesPersonApi } from './sales-person'
import { queueApi } from './queue'
import { pointsApi } from './points'

// Receipt printing API
const receiptApi = {
  printReceipt: (
    transaction: Transaction,
    options?: { customerName?: string; paidAmount?: string; change?: string }
  ) => ipcRenderer.invoke('receipt:print', transaction, options),
  updateReceiptPrinted: (transactionId: string, printed: boolean) =>
    ipcRenderer.invoke('db:transactions:updateReceiptPrinted', transactionId, printed),
  getConfig: () => ipcRenderer.invoke('receipt:getConfig'),
  updateConfig: (config: Partial<ReceiptConfig>) =>
    ipcRenderer.invoke('receipt:updateConfig', config)
}

// Printer API
const printerApi = {
  getConfig: () => ipcRenderer.invoke('receipt:getConfig'),
  updateConfig: (config: Partial<ReceiptConfig>) =>
    ipcRenderer.invoke('receipt:updateConfig', config),
  getStatus: () => ipcRenderer.invoke('printer:getStatus'),
  testPrint: () => ipcRenderer.invoke('printer:testPrint'),
  printExpenseReport: (data: ExpenseReportData) =>
    ipcRenderer.invoke('printer:printExpenseReport', data),
  printSettlementReport: (data: any) => ipcRenderer.invoke('printer:printSettlementReport', data),
  getAvailablePrinters: () =>
    ipcRenderer.invoke('printer:getAvailablePrinters') as Promise<{
      success: boolean
      data?: string[]
      error?: string
    }>,
  printDeliveryOrder: (data: any) =>
    ipcRenderer.invoke('printer:printDeliveryOrder', data) as Promise<{
      success: boolean
      error?: string
    }>
}

export const db = {
  // Master Data
  categories: categoryApi,
  suppliers: supplierApi,
  stores: storeApi,
  customerCategories: customerCategoryApi,
  customers: customerApi,
  uoms: uomApi,

  // Core
  users: userApi,
  products: productApi,
  roles: roleApi,
  userRoles: userRoleApi,
  permissions: permissionApi,
  rolePermissions: rolePermissionApi,
  auth: authApi,

  // Inventory
  productPrices: productPriceApi,
  productLocations: productLocationApi,
  batches: batchApi,
  stockTransactions: stockTransactionApi,
  inventory: inventoryApi,

  // Pricing
  pricing: pricingApi,
  priceCategories: priceCategoryApi,

  // Sales
  transactions: transactionApi,

  // Purchasing
  purchaseOrders: purchaseOrderApi,

  // Expenses
  expenses: expenseApi,

  // Sync
  sync: syncApi,

  // Shift
  shifts: shiftApi,

  // App Config
  appConfig: appConfigApi,

  // Receipt
  receipt: receiptApi,

  // Printer
  printer: printerApi,

  // Printer Config (multi-printer)
  printerConfigs: printerConfigApi,

  // Delivery Orders (Surat Jalan)
  deliveryOrders: deliveryOrderApi,

  // Payment Methods (Non-cash)
  paymentMethods: paymentMethodApi,

  // Sales Persons
  salesPersons: salesPersonApi,

  // Queue (cloud-first sync queue)
  queue: queueApi,

  // Points (member loyalty program)
  points: pointsApi
}
