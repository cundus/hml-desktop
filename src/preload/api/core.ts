import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface User extends BaseEntity {
  name: string
  email: string
  password: string
  storeId: string | null
  deviceId: string | null
}

export interface Product extends BaseEntity {
  sku: string
  name: string
  description: string | null
  unit: string
  cost: string
  categoryId: string | null
  isActive: boolean
  deviceId: string | null
}

// User API
export const userApi = {
  getAll: () => ipcRenderer.invoke('db:users:getAll') as Promise<ApiResponse<User[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:users:getById', id) as Promise<ApiResponse<User>>,
  
  getByEmail: (email: string) => ipcRenderer.invoke('db:users:getByEmail', email) as Promise<ApiResponse<User>>,
  
  create: (data: { name: string; email: string; password: string; storeId?: string }) => 
    ipcRenderer.invoke('db:users:create', data) as Promise<ApiResponse<User>>,
  
  update: (id: string, data: { name: string; email: string; password: string; storeId?: string }) => 
    ipcRenderer.invoke('db:users:update', id, data) as Promise<ApiResponse<User>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:users:delete', id) as Promise<ApiResponse<User>>,
  
  hardDelete: (id: string) => ipcRenderer.invoke('db:users:hardDelete', id) as Promise<ApiResponse<void>>,
  
  restore: (id: string) => ipcRenderer.invoke('db:users:restore', id) as Promise<ApiResponse<User>>
}

// Product API
export const productApi = {
  getAll: () => ipcRenderer.invoke('db:products:getAll') as Promise<ApiResponse<Product[]>>,
  
  getById: (id: string) => ipcRenderer.invoke('db:products:getById', id) as Promise<ApiResponse<Product>>,
  
  getBySku: (sku: string) => ipcRenderer.invoke('db:products:getBySku', sku) as Promise<ApiResponse<Product>>,
  
  search: (query: string) => ipcRenderer.invoke('db:products:search', query) as Promise<ApiResponse<Product[]>>,
  
  getByCategory: (categoryId: string) => ipcRenderer.invoke('db:products:getByCategory', categoryId) as Promise<ApiResponse<Product[]>>,
  
  create: (data: {
    sku: string
    name: string
    description?: string
    unit: string
    cost: string
    categoryId?: string
    isActive?: boolean
  }) => ipcRenderer.invoke('db:products:create', data) as Promise<ApiResponse<Product>>,
  
  update: (id: string, data: {
    name: string
    description?: string
    unit: string
    cost: string
    categoryId?: string
    isActive?: boolean
  }) => ipcRenderer.invoke('db:products:update', id, data) as Promise<ApiResponse<Product>>,
  
  delete: (id: string) => ipcRenderer.invoke('db:products:delete', id) as Promise<ApiResponse<Product>>,
  
  restore: (id: string) => ipcRenderer.invoke('db:products:restore', id) as Promise<ApiResponse<Product>>,
  
  toggleActive: (id: string) => ipcRenderer.invoke('db:products:toggleActive', id) as Promise<ApiResponse<Product>>
}
