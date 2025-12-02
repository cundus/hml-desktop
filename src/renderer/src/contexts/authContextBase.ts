import { createContext } from 'react'

export type Credentials = { identifier: string; password: string }

export type AuthContextValue = {
  token: string | null
  userName: string | null
  userRole: string | null
  storeId: string | null
  storeName: string | null
  groups: string[]
  permissions: string[]
  isAuthenticated: boolean
  isReady: boolean
  login: (creds: Credentials) => Promise<void>
  logout: () => void
  hasPermission: (required: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
