import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface ProductPrice extends BaseEntity {
  productId: string
  storeId: string
  price: string
  cost: string
  isActive: boolean
  deviceId: string | null
}

export interface ProductLocation extends BaseEntity {
  productId: string
  storeId: string
  quantity: number
  reservedQuantity: number
  deviceId: string | null
}

export interface Batch extends BaseEntity {
  productId: string
  code: string
  expiryDate: Date | null
}

export type StockTransactionType = 'INBOUND' | 'OUTBOUND' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'SALE'

export interface StockTransaction extends BaseEntity {
  productId: string
  storeId: string
  type: StockTransactionType
  quantity: number
  reference: string | null
  batchId: string | null
  supplierId: string | null
  customerId: string | null
  performedBy: string | null
  deviceId: string | null
}

export interface StockSummary {
  totalIn: number
  totalOut: number
  currentStock: number
}

// Product Price API
export const productPriceApi = {
  getAll: () => ipcRenderer.invoke('db:productPrices:getAll') as Promise<ApiResponse<ProductPrice[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:productPrices:getById', id) as Promise<ApiResponse<ProductPrice>>,
  
  getByProductId: (productId: string) => ipcRenderer.invoke('db:productPrices:getByProductId', productId) as Promise<ApiResponse<ProductPrice[]>>,
  
  getByStoreId: (storeId: string) => ipcRenderer.invoke('db:productPrices:getByStoreId', storeId) as Promise<ApiResponse<ProductPrice[]>>,
  
  getByProductAndStore: (productId: string, storeId: string) => 
    ipcRenderer.invoke('db:productPrices:getByProductAndStore', productId, storeId) as Promise<ApiResponse<ProductPrice>>,
  
  create: (data: {
    productId: string
    storeId: string
    price: string
    cost: string
    isActive?: boolean
  }) => ipcRenderer.invoke('db:productPrices:create', data) as Promise<ApiResponse<ProductPrice>>,
  
  update: (id: string, data: {
    price: string
    cost: string
    isActive?: boolean
  }) => ipcRenderer.invoke('db:productPrices:update', id, data) as Promise<ApiResponse<ProductPrice>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:productPrices:delete', id) as Promise<ApiResponse<ProductPrice>>,
  
  restore: (id: string) => ipcRenderer.invoke('db:productPrices:restore', id) as Promise<ApiResponse<ProductPrice>>
}

// Product Location API
export const productLocationApi = {
  getAll: () => ipcRenderer.invoke('db:productLocations:getAll') as Promise<ApiResponse<ProductLocation[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:productLocations:getById', id) as Promise<ApiResponse<ProductLocation>>,
  
  getByProductId: (productId: string) => ipcRenderer.invoke('db:productLocations:getByProductId', productId) as Promise<ApiResponse<ProductLocation[]>>,
  
  getByStoreId: (storeId: string) => ipcRenderer.invoke('db:productLocations:getByStoreId', storeId) as Promise<ApiResponse<ProductLocation[]>>,
  
  getByProductAndStore: (productId: string, storeId: string) => 
    ipcRenderer.invoke('db:productLocations:getByProductAndStore', productId, storeId) as Promise<ApiResponse<ProductLocation>>,
  
  create: (data: {
    productId: string
    storeId: string
    quantity?: number
    reservedQuantity?: number
  }) => ipcRenderer.invoke('db:productLocations:create', data) as Promise<ApiResponse<ProductLocation>>,
  
  update: (id: string, data: {
    quantity: number
    reservedQuantity?: number
  }) => ipcRenderer.invoke('db:productLocations:update', id, data) as Promise<ApiResponse<ProductLocation>>,
  
  adjustQuantity: (productId: string, storeId: string, delta: number) => 
    ipcRenderer.invoke('db:productLocations:adjustQuantity', productId, storeId, delta) as Promise<ApiResponse<ProductLocation>>,
  
  reserveQuantity: (productId: string, storeId: string, quantity: number) => 
    ipcRenderer.invoke('db:productLocations:reserveQuantity', productId, storeId, quantity) as Promise<ApiResponse<ProductLocation>>,
  
  releaseReservedQuantity: (productId: string, storeId: string, quantity: number) => 
    ipcRenderer.invoke('db:productLocations:releaseReservedQuantity', productId, storeId, quantity) as Promise<ApiResponse<ProductLocation>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:productLocations:delete', id) as Promise<ApiResponse<ProductLocation>>
}

// Batch API
export const batchApi = {
  getAll: () => ipcRenderer.invoke('db:batches:getAll') as Promise<ApiResponse<Batch[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:batches:getById', id) as Promise<ApiResponse<Batch>>,
  
  getByCode: (code: string) => ipcRenderer.invoke('db:batches:getByCode', code) as Promise<ApiResponse<Batch>>,
  
  getByProductId: (productId: string) => ipcRenderer.invoke('db:batches:getByProductId', productId) as Promise<ApiResponse<Batch[]>>,
  
  getExpiring: (days: number) => ipcRenderer.invoke('db:batches:getExpiring', days) as Promise<ApiResponse<Batch[]>>,
  
  create: (data: {
    productId: string
    code: string
    expiryDate?: Date
  }) => ipcRenderer.invoke('db:batches:create', data) as Promise<ApiResponse<Batch>>,
  
  update: (id: string, data: {
    code: string
    expiryDate?: Date
  }) => ipcRenderer.invoke('db:batches:update', id, data) as Promise<ApiResponse<Batch>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:batches:delete', id) as Promise<ApiResponse<Batch>>
}

// Stock Transaction API
export const stockTransactionApi = {
  getAll: () => ipcRenderer.invoke('db:stockTransactions:getAll') as Promise<ApiResponse<StockTransaction[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:stockTransactions:getById', id) as Promise<ApiResponse<StockTransaction>>,
  
  getByProductId: (productId: string) => ipcRenderer.invoke('db:stockTransactions:getByProductId', productId) as Promise<ApiResponse<StockTransaction[]>>,
  
  getByStoreId: (storeId: string) => ipcRenderer.invoke('db:stockTransactions:getByStoreId', storeId) as Promise<ApiResponse<StockTransaction[]>>,
  
  getByType: (type: StockTransactionType) => ipcRenderer.invoke('db:stockTransactions:getByType', type) as Promise<ApiResponse<StockTransaction[]>>,
  
  getByReference: (reference: string) => ipcRenderer.invoke('db:stockTransactions:getByReference', reference) as Promise<ApiResponse<StockTransaction[]>>,
  
  create: (data: {
    productId: string
    storeId: string
    type: StockTransactionType
    quantity: number
    reference?: string
    batchId?: string
    supplierId?: string
    customerId?: string
    performedBy?: string
  }) => ipcRenderer.invoke('db:stockTransactions:create', data) as Promise<ApiResponse<StockTransaction>>,
  
  getStockSummary: (productId: string, storeId: string) => 
    ipcRenderer.invoke('db:stockTransactions:getStockSummary', productId, storeId) as Promise<ApiResponse<StockSummary>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:stockTransactions:delete', id) as Promise<ApiResponse<StockTransaction>>
}
