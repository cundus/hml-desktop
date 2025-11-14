import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
  type AxiosRequestHeaders
} from 'axios'
import { getToken, clearToken } from './authStorage'

type Env = { RENDERER_VITE_API_BASE_URL?: string }
const { RENDERER_VITE_API_BASE_URL } = import.meta.env as unknown as Env

const api = axios.create({
  baseURL: RENDERER_VITE_API_BASE_URL || undefined,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      const headers = new AxiosHeaders(config.headers as AxiosRequestHeaders)
      headers.set('Authorization', `Bearer ${token}`)
      config.headers = headers
    }
  }
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken()
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

export default api
