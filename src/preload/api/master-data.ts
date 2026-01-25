import { ipcRenderer } from 'electron'
import { ApiResponse, BaseEntity } from './types'

// Types
export interface Category extends BaseEntity {
  name: string
}

export interface Supplier extends BaseEntity {
  name: string
  phone: string | null
  address: string | null
}

export interface Store extends BaseEntity {
  code: string
  name: string
  address: string | null
  type: string
}

export interface CustomerCategory extends BaseEntity {
  name: string
}

export interface Customer extends BaseEntity {
  name: string
  phone: string | null
  address: string | null
  categoryId: string | null
}

export interface Uom extends BaseEntity {
  code: string
  name: string
  deviceId: string | null
}

// Category API
export const categoryApi = {
  getAll: () => ipcRenderer.invoke('db:categories:getAll') as Promise<ApiResponse<Category[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:categories:getById', id) as Promise<ApiResponse<Category>>,

  create: (data: { name: string }) =>
    ipcRenderer.invoke('db:categories:create', data) as Promise<ApiResponse<Category>>,

  update: (id: string, data: { name: string }) =>
    ipcRenderer.invoke('db:categories:update', id, data) as Promise<ApiResponse<Category>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:categories:delete', id) as Promise<ApiResponse<Category>>
}

// Supplier API
export const supplierApi = {
  getAll: () => ipcRenderer.invoke('db:suppliers:getAll') as Promise<ApiResponse<Supplier[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:suppliers:getById', id) as Promise<ApiResponse<Supplier>>,

  search: (query: string) =>
    ipcRenderer.invoke('db:suppliers:search', query) as Promise<ApiResponse<Supplier[]>>,

  create: (data: { name: string; phone?: string; address?: string }) =>
    ipcRenderer.invoke('db:suppliers:create', data) as Promise<ApiResponse<Supplier>>,

  update: (id: string, data: { name: string; phone?: string; address?: string }) =>
    ipcRenderer.invoke('db:suppliers:update', id, data) as Promise<ApiResponse<Supplier>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:suppliers:softDelete', id) as Promise<ApiResponse<Supplier>>,

  restore: (id: string) =>
    ipcRenderer.invoke('db:suppliers:restore', id) as Promise<ApiResponse<Supplier>>
}

// Store API
export const storeApi = {
  getAll: () => ipcRenderer.invoke('db:stores:getAll') as Promise<ApiResponse<Store[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:stores:getById', id) as Promise<ApiResponse<Store>>,

  getByCode: (code: string) =>
    ipcRenderer.invoke('db:stores:getByCode', code) as Promise<ApiResponse<Store>>,

  getByType: (type: string) =>
    ipcRenderer.invoke('db:stores:getByType', type) as Promise<ApiResponse<Store[]>>,

  search: (query: string) =>
    ipcRenderer.invoke('db:stores:search', query) as Promise<ApiResponse<Store[]>>,

  create: (data: { code: string; name: string; address?: string; type: string }) =>
    ipcRenderer.invoke('db:stores:create', data) as Promise<ApiResponse<Store>>,

  update: (id: string, data: { code: string; name: string; address?: string; type: string }) =>
    ipcRenderer.invoke('db:stores:update', id, data) as Promise<ApiResponse<Store>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:stores:softDelete', id) as Promise<ApiResponse<Store>>,

  restore: (id: string) =>
    ipcRenderer.invoke('db:stores:restore', id) as Promise<ApiResponse<Store>>
}

// Customer Category API
export const customerCategoryApi = {
  getAll: () =>
    ipcRenderer.invoke('db:customerCategories:getAll') as Promise<ApiResponse<CustomerCategory[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:customerCategories:getById', id) as Promise<
      ApiResponse<CustomerCategory>
    >,

  create: (data: { name: string }) =>
    ipcRenderer.invoke('db:customerCategories:create', data) as Promise<
      ApiResponse<CustomerCategory>
    >,

  update: (id: string, data: { name: string }) =>
    ipcRenderer.invoke('db:customerCategories:update', id, data) as Promise<
      ApiResponse<CustomerCategory>
    >,

  delete: (id: string) =>
    ipcRenderer.invoke('db:customerCategories:softDelete', id) as Promise<
      ApiResponse<CustomerCategory>
    >,

  restore: (id: string) =>
    ipcRenderer.invoke('db:customerCategories:restore', id) as Promise<
      ApiResponse<CustomerCategory>
    >
}

// Customer API
export const customerApi = {
  getAll: () => ipcRenderer.invoke('db:customers:getAll') as Promise<ApiResponse<Customer[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:customers:getById', id) as Promise<ApiResponse<Customer>>,

  search: (query: string) =>
    ipcRenderer.invoke('db:customers:search', query) as Promise<ApiResponse<Customer[]>>,

  getByCategory: (categoryId: string) =>
    ipcRenderer.invoke('db:customers:getByCategory', categoryId) as Promise<
      ApiResponse<Customer[]>
    >,

  create: (data: { name: string; phone?: string; address?: string; categoryId?: string }) =>
    ipcRenderer.invoke('db:customers:create', data) as Promise<ApiResponse<Customer>>,

  update: (
    id: string,
    data: { name: string; phone?: string; address?: string; categoryId?: string }
  ) => ipcRenderer.invoke('db:customers:update', id, data) as Promise<ApiResponse<Customer>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:customers:delete', id) as Promise<ApiResponse<Customer>>,

  restore: (id: string) =>
    ipcRenderer.invoke('db:customers:restore', id) as Promise<ApiResponse<Customer>>
}

// UOM API
export const uomApi = {
  getAll: () => ipcRenderer.invoke('db:uoms:getAll') as Promise<ApiResponse<Uom[]>>,

  getById: (id: string) => ipcRenderer.invoke('db:uoms:getById', id) as Promise<ApiResponse<Uom>>,

  getByCode: (code: string) =>
    ipcRenderer.invoke('db:uoms:getByCode', code) as Promise<ApiResponse<Uom>>,

  create: (data: { code: string; name: string }) =>
    ipcRenderer.invoke('db:uoms:create', data) as Promise<ApiResponse<Uom>>,

  update: (id: string, data: { code?: string; name?: string }) =>
    ipcRenderer.invoke('db:uoms:update', id, data) as Promise<ApiResponse<Uom>>,

  delete: (id: string) => ipcRenderer.invoke('db:uoms:softDelete', id) as Promise<ApiResponse<Uom>>,

  restore: (id: string) => ipcRenderer.invoke('db:uoms:restore', id) as Promise<ApiResponse<Uom>>
}
