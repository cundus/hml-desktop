// import axios, {
//   AxiosError,
//   AxiosHeaders,
//   type InternalAxiosRequestConfig,
//   type AxiosRequestHeaders
// } from 'axios'
// import { getToken, clearToken } from './authStorage'

// type Env = { RENDERER_VITE_API_BASE_URL?: string }
// const { RENDERER_VITE_API_BASE_URL } = import.meta.env as unknown as Env

// const api = axios.create({
//   baseURL: RENDERER_VITE_API_BASE_URL || undefined,
//   headers: { 'Content-Type': 'application/json' }
// })

// api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
//   const token = getToken()
//   if (token) {
//     if (config.headers instanceof AxiosHeaders) {
//       config.headers.set('Authorization', `Bearer ${token}`)
//     } else {
//       const headers = new AxiosHeaders(config.headers as AxiosRequestHeaders)
//       headers.set('Authorization', `Bearer ${token}`)
//       config.headers = headers
//     }
//   }
//   return config
// })

// api.interceptors.response.use(
//   (resp) => resp,
//   (error: AxiosError) => {
//     if (error.response?.status === 401) {
//       clearToken()
//       window.location.hash = '#/login'
//     }
//     return Promise.reject(error)
//   }
// )

// export default api

type ApiResponse<T> = { data: T }

interface ApiClient {
  get<T = unknown>(url: string): Promise<ApiResponse<T>>
  post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>>
  put<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>>
  delete<T = unknown>(url: string): Promise<ApiResponse<T>>
}

type LoginResponse = { token: string; groups?: string[]; permissions?: string[] }

type Branch = {
  id: string
  code: string
  name: string
  address: string
  phone: string
}

type User = {
  id: string
  username: string
  fullName: string
  email: string
  role: string
}

type Customer = {
  id: string
  name: string
  phone?: string
  tier?: string
}

type Product = {
  id: string
  code: string
  name: string
  category: string
}


let branches: Branch[] = [
  {
    id: 'b1',
    code: 'BR-001',
    name: 'Main Branch',
    address: 'Jl. Utama No. 1, Jakarta',
    phone: '021-1234567'
  },
  {
    id: 'b2',
    code: 'BR-002',
    name: 'South Branch',
    address: 'Jl. Selatan No. 21, Bandung',
    phone: '022-7654321'
  }
]

let products: Product[] = [
  {
    id: 'p1',
    code: 'PRD-001',
    name: 'Premium Dog Food 10kg',
    category: 'Food'
  },
  {
    id: 'p2',
    code: 'PRD-002',
    name: 'Cat Kibble Salmon 5kg',
    category: 'Food'
  }
]

let users: User[] = [
  {
    id: 'u1',
    username: 'admin',
    fullName: 'System Admin',
    email: 'admin@example.com',
    role: 'admin'
  },
  {
    id: 'u2',
    username: 'cashier',
    fullName: 'Front Cashier',
    email: 'cashier@example.com',
    role: 'cashier'
  },
  {
    id: 'u3',
    username: 'supervisor',
    fullName: 'Store Supervisor',
    email: 'supervisor@example.com',
    role: 'supervisor'
  }
]

let customers: Customer[] = [
  {
    id: 'c1',
    name: 'Walk-in Customer',
    phone: '',
    tier: 'regular'
  },
  {
    id: 'c2',
    name: 'John Doe',
    phone: '0812-1111-2222',
    tier: 'member'
  }
]

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleGet<T>(url: string): Promise<ApiResponse<T>> {
  await delay()

  if (url === '/master/branches') {
    return { data: branches as unknown as T }
  }

  if (url === '/master/users') {
    return { data: users as unknown as T }
  }

  if (url === '/master/customers') {
    return { data: customers as unknown as T }
  }

  if (url === '/master/products') {
    return { data: products as unknown as T }
  }

  // Default empty response for unknown endpoints
  return { data: undefined as unknown as T }
}

async function handlePost<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  await delay()

  if (url === '/master/branches') {
    const body = data as Partial<Branch>
    const created: Branch = {
      id: `b${Date.now()}`,
      code: body.code ?? 'BR-NEW',
      name: body.name ?? 'New Branch',
      address: body.address ?? '',
      phone: body.phone ?? ''
    }
    branches = [...branches, created]
    return { data: created as unknown as T }
  }

  if (url === '/master/users') {
    const body = data as Partial<User>
    const created: User = {
      id: `u${Date.now()}`,
      username: body.username ?? 'new-user',
      fullName: body.fullName ?? 'New User',
      email: body.email ?? 'user@example.com',
      role: body.role ?? 'staff'
    }
    users = [...users, created]
    return { data: created as unknown as T }
  }

  if (url === '/master/customers') {
    const body = data as Partial<Customer>
    const created: Customer = {
      id: `c${Date.now()}`,
      name: body.name ?? 'New Customer',
      phone: body.phone ?? '',
      tier: body.tier ?? 'regular'
    }
    customers = [...customers, created]
    return { data: created as unknown as T }
  }

  if (url === '/master/products') {
    const body = data as Partial<Product>
    const created: Product = {
      id: `p${Date.now()}`,
      code: body.code ?? 'PRD-NEW',
      name: body.name ?? 'New Product',
      category: body.category ?? 'Uncategorized'
    }
    products = [...products, created]
    return { data: created as unknown as T }
  }

  return { data: undefined as unknown as T }
}

async function handlePut<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  await delay()

  if (url.startsWith('/master/branches/')) {
    const id = url.split('/').at(-1) as string
    const body = data as Partial<Branch>
    let updated: Branch | undefined
    branches = branches.map((b) => {
      if (b.id !== id) return b
      updated = { ...b, ...body }
      return updated
    })
    return { data: (updated ?? ({} as Branch)) as unknown as T }
  }

  if (url.startsWith('/master/users/')) {
    const id = url.split('/').at(-1) as string
    const body = data as Partial<User>
    let updated: User | undefined
    users = users.map((u) => {
      if (u.id !== id) return u
      updated = { ...u, ...body }
      return updated
    })
    return { data: (updated ?? ({} as User)) as unknown as T }
  }

  if (url.startsWith('/master/customers/')) {
    const id = url.split('/').at(-1) as string
    const body = data as Partial<Customer>
    let updated: Customer | undefined
    customers = customers.map((c) => {
      if (c.id !== id) return c
      updated = { ...c, ...body }
      return updated
    })
    return { data: (updated ?? ({} as Customer)) as unknown as T }
  }

  if (url.startsWith('/master/products/')) {
    const id = url.split('/').at(-1) as string
    const body = data as Partial<Product>
    let updated: Product | undefined
    products = products.map((p) => {
      if (p.id !== id) return p
      updated = { ...p, ...body }
      return updated
    })
    return { data: (updated ?? ({} as Product)) as unknown as T }
  }

  return { data: undefined as unknown as T }
}

async function handleDelete<T>(url: string): Promise<ApiResponse<T>> {
  await delay()

  if (url.startsWith('/master/branches/')) {
    const id = url.split('/').at(-1) as string
    branches = branches.filter((b) => b.id !== id)
    return { data: undefined as unknown as T }
  }

  if (url.startsWith('/master/users/')) {
    const id = url.split('/').at(-1) as string
    users = users.filter((u) => u.id !== id)
    return { data: undefined as unknown as T }
  }

  if (url.startsWith('/master/customers/')) {
    const id = url.split('/').at(-1) as string
    customers = customers.filter((c) => c.id !== id)
    return { data: undefined as unknown as T }
  }

  if (url.startsWith('/master/products/')) {
    const id = url.split('/').at(-1) as string
    products = products.filter((p) => p.id !== id)
    return { data: undefined as unknown as T }
  }

  return { data: undefined as unknown as T }
}

const api: ApiClient = {
  get: handleGet,
  post: handlePost,
  put: handlePut,
  delete: handleDelete
}

export default api
