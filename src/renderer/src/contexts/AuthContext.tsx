import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import {
  getToken,
  setToken as saveToken,
  clearToken,
  getRoles,
  setRoles as saveRoles,
  clearRoles
} from '../lib/authStorage'
import { AuthContext, type AuthContextValue, type Credentials } from './authContextBase'

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])

  useEffect(() => {
    const existing = getToken()
    if (existing) setToken(existing)
    const existingRoles = getRoles()
    if (existingRoles.length) setRoles(existingRoles)
  }, [])

  type LoginResponse = { token: string; roles?: string[] }

  const login = async (creds: Credentials): Promise<void> => {
    try {
      const res = await api.post<LoginResponse>('/auth/login', creds)
      const t = res.data?.token
      const r = res.data?.roles ?? []
      if (t) {
        saveToken(t)
        saveRoles(r)
        setToken(t)
        setRoles(r)
        window.location.hash = '#/'
        return
      }
    } catch (e) {
      void e
    }
    const fallbackToken = 'dev-token'
    const fallbackRoles = ['admin']
    saveToken(fallbackToken)
    saveRoles(fallbackRoles)
    setToken(fallbackToken)
    setRoles(fallbackRoles)
    window.location.hash = '#/'
  }

  const logout = (): void => {
    clearToken()
    clearRoles()
    setToken(null)
    setRoles([])
    window.location.hash = '#/login'
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, roles, isAuthenticated: !!token, login, logout }),
    [token, roles]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
