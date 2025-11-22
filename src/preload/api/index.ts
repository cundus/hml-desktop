// Export all API modules
export * from './types'
export * from './master-data'
export * from './core'
export * from './inventory'
export * from './sales'
export * from './purchasing'
export * from './sync'

// Re-export for convenience
import { categoryApi, supplierApi, storeApi, customerCategoryApi, customerApi } from './master-data'
import {
  userApi,
  productApi,
  roleApi,
  userRoleApi,
  permissionApi,
  rolePermissionApi,
  authApi
} from './core'
import { productPriceApi, productLocationApi, batchApi, stockTransactionApi } from './inventory'
import { transactionApi } from './sales'
import { purchaseOrderApi } from './purchasing'
import { syncApi } from './sync'

export const db = {
  // Master Data
  categories: categoryApi,
  suppliers: supplierApi,
  stores: storeApi,
  customerCategories: customerCategoryApi,
  customers: customerApi,
  
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
  
  // Sales
  transactions: transactionApi,
  
  // Purchasing
  purchaseOrders: purchaseOrderApi,
  
  // Sync
  sync: syncApi
}
