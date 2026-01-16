import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export interface SalesPerson {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreateSalesPersonDto {
  name: string
  isActive?: boolean
}

export interface UpdateSalesPersonDto {
  name?: string
  isActive?: boolean
}

export const salesPersonApi = {
  getAll: () => ipcRenderer.invoke('db:salesPersons:getAll') as Promise<ApiResponse<SalesPerson[]>>,

  getActive: () =>
    ipcRenderer.invoke('db:salesPersons:getActive') as Promise<ApiResponse<SalesPerson[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:salesPersons:getById', id) as Promise<ApiResponse<SalesPerson>>,

  create: (data: CreateSalesPersonDto) =>
    ipcRenderer.invoke('db:salesPersons:create', data) as Promise<ApiResponse<SalesPerson>>,

  update: (id: string, data: UpdateSalesPersonDto) =>
    ipcRenderer.invoke('db:salesPersons:update', id, data) as Promise<ApiResponse<SalesPerson>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:salesPersons:delete', id) as Promise<ApiResponse<boolean>>
}
