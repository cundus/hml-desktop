import { createContext } from 'react'

export type Credentials = { email: string; password: string }

export type AuthContextValue = {
  token: string | null
  roles: string[]
  isAuthenticated: boolean
  login: (creds: Credentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
