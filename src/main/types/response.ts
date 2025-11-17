// API Response types

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  success: false
  error: string
  validationErrors?: ValidationError[]
}
