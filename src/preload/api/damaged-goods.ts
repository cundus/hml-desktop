import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface DamagedGood extends BaseEntity {
  productId: string
  storeId: string
  uomId: string
  quantity: number
  cost: string
  totalLoss: string
  reason: string
  notes: string | null
  performedBy: string
  productName?: string
  productSku?: string
  storeName?: string
  uomCode?: string
}

export interface CreateDamagedGoodDto {
  productId: string
  storeId: string
  uomId: string
  quantity: number
  cost: string
  reason: string
  notes?: string
  performedBy: string
}

export interface DamagedGoodsSummary {
  totalLoss: string
  count: number
}

// Damaged Goods API
export const damagedGoodsApi = {
  getAll: () =>
    ipcRenderer.invoke('db:damagedGoods:getAll') as Promise<ApiResponse<DamagedGood[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:damagedGoods:getById', id) as Promise<ApiResponse<DamagedGood>>,

  getByStoreId: (storeId: string) =>
    ipcRenderer.invoke('db:damagedGoods:getByStoreId', storeId) as Promise<
      ApiResponse<DamagedGood[]>
    >,

  getByDateRange: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('db:damagedGoods:getByDateRange', startDate, endDate) as Promise<
      ApiResponse<DamagedGood[]>
    >,

  getTotalLossByDateRange: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('db:damagedGoods:getTotalLossByDateRange', startDate, endDate) as Promise<
      ApiResponse<DamagedGoodsSummary>
    >,

  create: (data: CreateDamagedGoodDto) =>
    ipcRenderer.invoke('db:damagedGoods:create', data) as Promise<ApiResponse<DamagedGood>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:damagedGoods:delete', id) as Promise<ApiResponse<void>>
}
