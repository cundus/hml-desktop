import { createContext } from 'react'

export type Credentials = { email: string; password: string }

export type AuthContextValue = {
  token: string | null
  groups: string[]
  permissions: string[]
  isAuthenticated: boolean
  login: (creds: Credentials) => Promise<void>
  logout: () => void
  hasPermission: (required: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
