import { ipcRenderer } from 'electron'
import { ApiResponse } from '../../main/types/response'

export interface ReturnDto {
  transactionId: string
  storeId: string
  returnNumber: string
  totalRefund: string
  reason?: string
  createdBy: string
  items: ReturnItemDto[]
}

export interface ReturnItemDto {
  transactionItemId: string
  productId: string
  quantity: number
  refundPrice: string
  restock: boolean
}

export const returns = {
  create: (data: ReturnDto): Promise<ApiResponse> => ipcRenderer.invoke('db:returns:create', data),
  getByTransactionId: (transactionId: string): Promise<ApiResponse> =>
    ipcRenderer.invoke('db:returns:getByTransactionId', transactionId),
  getSummaryByDateRange: (
    startDate: string,
    endDate: string,
    storeId?: string
  ): Promise<ApiResponse> =>
    ipcRenderer.invoke('db:returns:getSummaryByDateRange', startDate, endDate, storeId)
}
