import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

// Types
export interface OpenBill {
  id: string
  label: string | null
  storeId: string
  shiftId: string
  customerId: string | null
  salesId: string | null
  salesName: string | null
  subtotal: string
  discount: string
  total: string
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  items?: OpenBillItem[]
}

export interface OpenBillItem {
  id: string
  openBillId: string
  productId: string
  cartItemId: string
  quantity: number
  displayQuantity: number | null
  uomCode: string | null
  uomId: string | null
  priceCategoryId: string | null
  priceCategoryName: string | null
  conversionFactor: number
  baseQuantity: number
  productName: string | null
  productSku: string | null
  unitPrice: string
  weight: string
  createdAt: Date
}

export interface CreateOpenBillDto {
  label?: string
  storeId: string
  shiftId: string
  customerId?: string
  salesId?: string
  salesName?: string
  subtotal: string
  discount: string
  total: string
  notes?: string
  createdBy?: string
  items: {
    productId: string
    cartItemId: string
    quantity: number
    displayQuantity?: number
    uomCode?: string
    uomId?: string
    priceCategoryId?: string
    priceCategoryName?: string
    conversionFactor: number
    baseQuantity: number
    productName?: string
    productSku?: string
    unitPrice: string
    weight?: string
  }[]
}

// Open Bill API
export const openBillApi = {
  create: (data: CreateOpenBillDto) =>
    ipcRenderer.invoke('db:openBills:create', data) as Promise<ApiResponse<OpenBill>>,

  getByShiftId: (shiftId: string) =>
    ipcRenderer.invoke('db:openBills:getByShiftId', shiftId) as Promise<ApiResponse<OpenBill[]>>,

  getByStoreId: (storeId: string) =>
    ipcRenderer.invoke('db:openBills:getByStoreId', storeId) as Promise<ApiResponse<OpenBill[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:openBills:getById', id) as Promise<ApiResponse<OpenBill | undefined>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:openBills:delete', id) as Promise<ApiResponse<void>>,

  deleteByShiftId: (shiftId: string) =>
    ipcRenderer.invoke('db:openBills:deleteByShiftId', shiftId) as Promise<ApiResponse<void>>,

  countByShiftId: (shiftId: string) =>
    ipcRenderer.invoke('db:openBills:countByShiftId', shiftId) as Promise<ApiResponse<number>>
}
