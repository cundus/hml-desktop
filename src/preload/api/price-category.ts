import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export interface PriceCategory {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CreatePriceCategoryDto {
  id?: string
  name: string
  description?: string
  isDefault?: boolean
  sortOrder?: number
}

export interface UpdatePriceCategoryDto {
  name?: string
  description?: string
  isDefault?: boolean
  sortOrder?: number
}

export const priceCategoryApi = {
  getAll: () =>
    ipcRenderer.invoke('db:priceCategories:getAll') as Promise<ApiResponse<PriceCategory[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:priceCategories:getById', id) as Promise<ApiResponse<PriceCategory>>,

  create: (data: CreatePriceCategoryDto) =>
    ipcRenderer.invoke('db:priceCategories:create', data) as Promise<ApiResponse<PriceCategory>>,

  update: (id: string, data: UpdatePriceCategoryDto) =>
    ipcRenderer.invoke('db:priceCategories:update', id, data) as Promise<
      ApiResponse<PriceCategory>
    >,

  delete: (id: string) =>
    ipcRenderer.invoke('db:priceCategories:delete', id) as Promise<ApiResponse<void>>
}
