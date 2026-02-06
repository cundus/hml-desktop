import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface Expense extends BaseEntity {
  shiftId: string | null
  categoryId: string | null
  storeId: string | null
  item: string
  quantity: number
  price: string
  total: string
  description: string | null
  createdBy: string | null
  categoryName?: string
  storeName?: string
}

export interface CreateExpenseDto {
  shiftId?: string
  categoryId?: string
  storeId?: string
  item: string
  quantity?: number
  price: string
  description?: string
  createdBy?: string
}

export interface ExpenseSummary {
  totalExpenses: string
  expenseCount: number
}

// Expense API
export const expenseApi = {
  getAll: () => ipcRenderer.invoke('db:expenses:getAll') as Promise<ApiResponse<Expense[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:expenses:getById', id) as Promise<ApiResponse<Expense>>,

  getByShiftId: (shiftId: string) =>
    ipcRenderer.invoke('db:expenses:getByShiftId', shiftId) as Promise<ApiResponse<Expense[]>>,

  getByDateRange: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('db:expenses:getByDateRange', startDate, endDate) as Promise<
      ApiResponse<Expense[]>
    >,

  getSummaryByShift: (shiftId: string) =>
    ipcRenderer.invoke('db:expenses:getSummaryByShift', shiftId) as Promise<
      ApiResponse<ExpenseSummary>
    >,

  getSummaryByDateRange: (startDate: string, endDate: string) =>
    ipcRenderer.invoke('db:expenses:getSummaryByDateRange', startDate, endDate) as Promise<
      ApiResponse<ExpenseSummary>
    >,

  create: (data: CreateExpenseDto) =>
    ipcRenderer.invoke('db:expenses:create', data) as Promise<ApiResponse<Expense>>,

  update: (id: string, data: Partial<CreateExpenseDto>) =>
    ipcRenderer.invoke('db:expenses:update', id, data) as Promise<ApiResponse<Expense>>,

  delete: (id: string) => ipcRenderer.invoke('db:expenses:delete', id) as Promise<ApiResponse<void>>
}
