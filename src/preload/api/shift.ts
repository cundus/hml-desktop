import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

export interface CashierShift extends BaseEntity {
  userId: string
  storeId: string
  status: 'OPEN' | 'CLOSED'
  initialCash: string
  closingCash: string | null
  expectedCash: string | null
  difference: string | null
  notes: string | null
  openedAt: Date
  closedAt: Date | null
  deviceId: string | null
  userName?: string
}

export interface ShiftHistory {
  id: string
  shiftId: string
  userId: string
  action: 'OPEN' | 'CLOSE' | 'TAKEOVER' | 'BREAK'
  notes: string | null
  createdAt: Date
  deviceId: string | null
  userName?: string
}

export interface OpenShiftDto {
  userId: string
  storeId: string
  initialCash: string
}

export interface CloseShiftDto {
  closingCash: string
  notes?: string
}

export interface ShiftFilters {
  userId?: string
  storeId?: string
  status?: 'OPEN' | 'CLOSED'
  fromDate?: number
  toDate?: number
}

export interface ShiftSummary {
  shift: CashierShift
  transactionCount: number
  totalSales: string
  totalDiscount: string
  totalTax: string
  netSales: string
  expectedCash: string
  transactions: {
    id: string
    code: string
    total: string
    createdAt: Date
    customerName?: string
  }[]
}

export const shiftApi = {
  getCurrentShift: (userId: string) =>
    ipcRenderer.invoke('db:shifts:getCurrentShift', userId) as Promise<
      ApiResponse<CashierShift | null>
    >,

  getCurrentStoreShift: (storeId: string) =>
    ipcRenderer.invoke('db:shifts:getCurrentStoreShift', storeId) as Promise<
      ApiResponse<CashierShift | null>
    >,

  findById: (id: string) =>
    ipcRenderer.invoke('db:shifts:findById', id) as Promise<ApiResponse<CashierShift | null>>,

  getAll: (filters?: ShiftFilters) =>
    ipcRenderer.invoke('db:shifts:getAll', filters) as Promise<ApiResponse<CashierShift[]>>,

  open: (data: OpenShiftDto) =>
    ipcRenderer.invoke('db:shifts:open', data) as Promise<ApiResponse<CashierShift>>,

  close: (shiftId: string, userId: string, data: CloseShiftDto) =>
    ipcRenderer.invoke('db:shifts:close', shiftId, userId, data) as Promise<
      ApiResponse<CashierShift>
    >,

  takeover: (shiftId: string, newUserId: string, pin: string) =>
    ipcRenderer.invoke('db:shifts:takeover', shiftId, newUserId, pin) as Promise<
      ApiResponse<CashierShift>
    >,

  getHistory: (shiftId: string) =>
    ipcRenderer.invoke('db:shifts:getHistory', shiftId) as Promise<ApiResponse<ShiftHistory[]>>,

  getSummary: (shiftId: string) =>
    ipcRenderer.invoke('db:shifts:getSummary', shiftId) as Promise<ApiResponse<ShiftSummary | null>>
}
