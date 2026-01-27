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

export interface Role extends BaseEntity {
  name: string
  description: string | null
  deviceId: string | null
}

export interface UserRole extends BaseEntity {
  userId: string
  roleId: string
  deviceId: string | null
}

export interface Permission extends BaseEntity {
  name: string
  description: string | null
  deviceId: string | null
}

export interface RolePermission extends BaseEntity {
  roleId: string
  permissionId: string
  deviceId: string | null
}

export interface LoginResult {
  token: string
  groups: string[]
  permissions: string[]
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

  getByEmail: (email: string) =>
    ipcRenderer.invoke('db:users:getByEmail', email) as Promise<ApiResponse<User>>,

  create: (data: { name: string; email: string; password: string; storeId?: string }) =>
    ipcRenderer.invoke('db:users:create', data) as Promise<ApiResponse<User>>,

  update: (
    id: string,
    data: { name?: string; email?: string; password?: string; storeId?: string }
  ) => ipcRenderer.invoke('db:users:update', id, data) as Promise<ApiResponse<User>>,

  delete: (id: string) => ipcRenderer.invoke('db:users:delete', id) as Promise<ApiResponse<User>>,

  hardDelete: (id: string) =>
    ipcRenderer.invoke('db:users:delete', id) as Promise<ApiResponse<void>>,

  restore: (id: string) => ipcRenderer.invoke('db:users:restore', id) as Promise<ApiResponse<User>>,

  updatePin: (id: string, pin: string | null) =>
    ipcRenderer.invoke('db:users:updatePin', id, pin) as Promise<ApiResponse<User>>,

  hasPin: (id: string) => ipcRenderer.invoke('db:users:hasPin', id) as Promise<ApiResponse<boolean>>
}

// Role API
export const roleApi = {
  getAll: () => ipcRenderer.invoke('db:roles:getAll') as Promise<ApiResponse<Role[]>>,

  create: (data: { name: string; description?: string }) =>
    ipcRenderer.invoke('db:roles:create', data) as Promise<ApiResponse<Role>>,

  update: (id: string, data: { name?: string; description?: string }) =>
    ipcRenderer.invoke('db:roles:update', id, data) as Promise<ApiResponse<Role>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:roles:softDelete', id) as Promise<ApiResponse<Role>>,

  restore: (id: string) => ipcRenderer.invoke('db:roles:restore', id) as Promise<ApiResponse<Role>>
}

// UserRole API
export const userRoleApi = {
  getAll: () => ipcRenderer.invoke('db:userRoles:getAll') as Promise<ApiResponse<UserRole[]>>,

  getByUserId: (userId: string) =>
    ipcRenderer.invoke('db:userRoles:getByUserId', userId) as Promise<ApiResponse<UserRole[]>>,

  setForUser: (userId: string, roleIds: string[]) =>
    ipcRenderer.invoke('db:userRoles:setForUser', userId, roleIds) as Promise<
      ApiResponse<UserRole[]>
    >
}

// Permission API
export const permissionApi = {
  getAll: () => ipcRenderer.invoke('db:permissions:getAll') as Promise<ApiResponse<Permission[]>>
}

// RolePermission API
export const rolePermissionApi = {
  getAll: () =>
    ipcRenderer.invoke('db:rolePermissions:getAll') as Promise<ApiResponse<RolePermission[]>>,

  getByRoleId: (roleId: string) =>
    ipcRenderer.invoke('db:rolePermissions:getByRoleId', roleId) as Promise<
      ApiResponse<RolePermission[]>
    >,

  setForRole: (roleId: string, permissionIds: string[]) =>
    ipcRenderer.invoke('db:rolePermissions:setForRole', roleId, permissionIds) as Promise<
      ApiResponse<RolePermission[]>
    >
}

// Auth API
export const authApi = {
  login: (identifier: string, password: string) =>
    ipcRenderer.invoke('auth:login', identifier, password) as Promise<ApiResponse<LoginResult>>,

  verifyPin: (userId: string, pin: string) =>
    ipcRenderer.invoke('auth:verifyPin', userId, pin) as Promise<ApiResponse<boolean>>
}

// Product API
export const productApi = {
  getAll: () => ipcRenderer.invoke('db:products:getAll') as Promise<ApiResponse<Product[]>>,

  getById: (id: string) =>
    ipcRenderer.invoke('db:products:getById', id) as Promise<ApiResponse<Product>>,

  getBySku: (sku: string) =>
    ipcRenderer.invoke('db:products:getBySku', sku) as Promise<ApiResponse<Product>>,

  search: (query: string) =>
    ipcRenderer.invoke('db:products:search', query) as Promise<ApiResponse<Product[]>>,

  getByCategory: (categoryId: string) =>
    ipcRenderer.invoke('db:products:getByCategory', categoryId) as Promise<ApiResponse<Product[]>>,

  create: (data: {
    sku: string
    name: string
    description?: string
    unit: string
    cost: string
    categoryId?: string
    isActive?: boolean
  }) => ipcRenderer.invoke('db:products:create', data) as Promise<ApiResponse<Product>>,

  update: (
    id: string,
    data: {
      name: string
      description?: string
      unit: string
      cost: string
      categoryId?: string
      isActive?: boolean
    }
  ) => ipcRenderer.invoke('db:products:update', id, data) as Promise<ApiResponse<Product>>,

  delete: (id: string) =>
    ipcRenderer.invoke('db:products:delete', id) as Promise<ApiResponse<Product>>,

  toggleActive: (id: string) =>
    ipcRenderer.invoke('db:products:toggleActive', id) as Promise<ApiResponse<Product>>,

  // Excel import/export
  exportExcel: () =>
    ipcRenderer.invoke('db:products:exportExcel') as Promise<ApiResponse<{ filePath: string }>>,

  importBatch: (data: any[], storeId: string, performedBy: string) =>
    ipcRenderer.invoke('db:products:importBatch', data, storeId, performedBy) as Promise<
      ApiResponse<{
        successCount: number
        failureCount: number
        errors?: string[]
      }>
    >,

  downloadTemplate: () =>
    ipcRenderer.invoke('db:products:downloadTemplate') as Promise<ApiResponse<{ filePath: string }>>,

  deleteBatch: (ids: string[]) =>
    ipcRenderer.invoke('db:products:deleteBatch', ids) as Promise<
      ApiResponse<{
        successCount: number
        failureCount: number
        errors?: string[]
      }>
    >
}
