import { ipcRenderer } from 'electron'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ExpenseCategory {
  id: string
  code: string
  name: string
  type: 'shift' | 'operational'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseCategoryDto {
  code: string
  name: string
  type: 'shift' | 'operational'
  isActive?: boolean
}

export interface UpdateExpenseCategoryDto {
  code?: string
  name?: string
  type?: 'shift' | 'operational'
  isActive?: boolean
}

export const expenseCategoriesApi = {
  getAll: () =>
    ipcRenderer.invoke('db:expenseCategories:getAll') as Promise<ApiResponse<ExpenseCategory[]>>,

  getByType: (type: 'shift' | 'operational') =>
    ipcRenderer.invoke('db:expenseCategories:getByType', type) as Promise<ApiResponse<ExpenseCategory[]>>,

  findById: (id: string) =>
    ipcRenderer.invoke('db:expenseCategories:findById', id) as Promise<ApiResponse<ExpenseCategory | null>>,

  create: (data: CreateExpenseCategoryDto) =>
    ipcRenderer.invoke('db:expenseCategories:create', data) as Promise<ApiResponse<ExpenseCategory>>,

  update: (id: string, data: UpdateExpenseCategoryDto) =>
    ipcRenderer.invoke('db:expenseCategories:update', id, data) as Promise<ApiResponse<ExpenseCategory>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:expenseCategories:delete', id) as Promise<ApiResponse<boolean>>
}
