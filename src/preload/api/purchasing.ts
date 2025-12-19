import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderItem {
  id: string
  poId: string
  productId: string
  quantity: number
  cost: string
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrder extends BaseEntity {
  code: string
  supplierId: string
  storeId: string
  status: PurchaseOrderStatus
  total: string
  items?: PurchaseOrderItem[]
}

// Purchase Order API
export const purchaseOrderApi = {
  getAll: () =>
    ipcRenderer.invoke('db:purchaseOrders:getAll') as Promise<ApiResponse<PurchaseOrder[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:purchaseOrders:getById', id) as Promise<ApiResponse<PurchaseOrder>>,

  getByCode: (code: string) =>
    ipcRenderer.invoke('db:purchaseOrders:getByCode', code) as Promise<ApiResponse<PurchaseOrder>>,

  getBySupplierId: (supplierId: string) =>
    ipcRenderer.invoke('db:purchaseOrders:getBySupplierId', supplierId) as Promise<
      ApiResponse<PurchaseOrder[]>
    >,

  getByStoreId: (storeId: string) =>
    ipcRenderer.invoke('db:purchaseOrders:getByStoreId', storeId) as Promise<
      ApiResponse<PurchaseOrder[]>
    >,

  getByStatus: (status: PurchaseOrderStatus) =>
    ipcRenderer.invoke('db:purchaseOrders:getByStatus', status) as Promise<
      ApiResponse<PurchaseOrder[]>
    >,

  create: (data: {
    code: string
    supplierId: string
    storeId: string
    status?: PurchaseOrderStatus
    total: string
    items: {
      productId: string
      quantity: number
      cost: string
    }[]
  }) => ipcRenderer.invoke('db:purchaseOrders:create', data) as Promise<ApiResponse<PurchaseOrder>>,

  update: (
    id: string,
    data: {
      status: PurchaseOrderStatus
      total?: string
    }
  ) =>
    ipcRenderer.invoke('db:purchaseOrders:update', id, data) as Promise<ApiResponse<PurchaseOrder>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:purchaseOrders:delete', id) as Promise<ApiResponse<PurchaseOrder>>,

  receive: (id: string) =>
    ipcRenderer.invoke('db:purchaseOrders:receive', id) as Promise<ApiResponse<PurchaseOrder>>
}
