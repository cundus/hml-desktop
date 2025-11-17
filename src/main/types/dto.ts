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

export interface CreateProductDto {
  sku: string
  name: string
  description?: string
  unit: string
  cost: number
  categoryId?: string
  isActive?: boolean
}

export interface UpdateProductDto {
  name?: string
  description?: string
  unit?: string
  cost?: number
  categoryId?: string
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
