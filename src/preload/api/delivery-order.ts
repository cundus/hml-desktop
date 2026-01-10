import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export interface DeliveryOrder {
  id: string
  transactionId: string
  noSuratJalan: string
  sequenceNumber: number
  sequenceYear: number
  tanggal: Date
  sales: string | null
  customerId: string | null
  customerName: string
  customerAddress: string | null
  notes: string | null
  printedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateDeliveryOrderDto {
  transactionId: string
  tanggal: Date | string
  sales?: string
  customerId?: string
  customerName: string
  customerAddress?: string
  notes?: string
}

export const deliveryOrderApi = {
  getAll: () =>
    ipcRenderer.invoke('db:deliveryOrder:getAll') as Promise<ApiResponse<DeliveryOrder[]>>,

  findById: (id: string) =>
    ipcRenderer.invoke('db:deliveryOrder:findById', id) as Promise<ApiResponse<DeliveryOrder | null>>,

  findByTransactionId: (transactionId: string) =>
    ipcRenderer.invoke('db:deliveryOrder:findByTransactionId', transactionId) as Promise<
      ApiResponse<DeliveryOrder | null>
    >,

  create: (data: CreateDeliveryOrderDto) =>
    ipcRenderer.invoke('db:deliveryOrder:create', data) as Promise<ApiResponse<DeliveryOrder>>,

  markAsPrinted: (id: string) =>
    ipcRenderer.invoke('db:deliveryOrder:markAsPrinted', id) as Promise<ApiResponse<boolean>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:deliveryOrder:delete', id) as Promise<ApiResponse<boolean>>
}
