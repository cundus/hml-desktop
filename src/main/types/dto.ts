// Data Transfer Objects (DTOs) for API requests

export interface CreateUserDto {
  name: string
  email: string
  password: string
  storeId?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
  password?: string
  storeId?: string
}

export interface CreateRoleDto {
  name: string
  description?: string
}

export interface UpdateRoleDto {
  name?: string
  description?: string
}

export interface CreateProductDto {
  sku: string
  name: string
  description?: string
  unit: string
  cost: number
  weight?: number
  categoryId?: string
  supplierId?: string
  isService?: boolean
  isActive?: boolean
}

export interface UpdateProductDto {
  name?: string
  description?: string
  unit?: string
  cost?: number
  weight?: number
  categoryId?: string
  supplierId?: string
  isService?: boolean
  isActive?: boolean
}

export interface CreateCategoryDto {
  name: string
}

export interface UpdateCategoryDto {
  name?: string
}

export interface CreateCustomerDto {
  name: string
  phone?: string
}

export interface UpdateCustomerDto {
  name?: string
  phone?: string
}

export interface CreateSupplierDto {
  name: string
  phone?: string
  address?: string
}

export interface UpdateSupplierDto {
  name?: string
  phone?: string
  address?: string
}

export interface CreateStoreDto {
  code: string
  name: string
  address?: string
  type: string
}

export interface UpdateStoreDto {
  code?: string
  name?: string
  address?: string
  type?: string
}

export interface CreateCustomerCategoryDto {
  name: string
}

export interface UpdateCustomerCategoryDto {
  name?: string
}
