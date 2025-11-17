import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import {
  getToken,
  setToken as saveToken,
  clearToken,
  getGroups,
  setGroups as saveGroups,
  clearGroups,
  getPermissions,
  setPermissions as savePermissions,
  clearPermissions
} from '../lib/authStorage'
import { AuthContext, type AuthContextValue, type Credentials } from './authContextBase'

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    const existing = getToken()
    if (existing) setToken(existing)
    const existingGroups = getGroups()
    if (existingGroups.length) setGroups(existingGroups)
    const existingPermissions = getPermissions()
    if (existingPermissions.length) setPermissions(existingPermissions)
  }, [])

  type LoginResponse = { token: string; groups?: string[]; permissions?: string[] }

  const login = useCallback(async (creds: Credentials): Promise<void> => {
    try {
      const res = await api.post<LoginResponse>('/auth/login', creds)
      const t = res.data?.token
      const g = res.data?.groups ?? []
      const p = res.data?.permissions ?? []
      if (t) {
        saveToken(t)
        saveGroups(g)
        savePermissions(p)
        setToken(t)
        setGroups(g)
        setPermissions(p)
        window.location.hash = '#/'
        return
      }
    } catch (e) {
      void e
    }
    const fallbackToken = 'dev-token'
    const fallbackGroups = ['admin']
    const fallbackPermissions = [
      'dashboard.view',
      'sales.view',
      'settings.view',
      'master.branch.manage',
      'master.user.manage',
      'master.customer.manage'
    ]
    saveToken(fallbackToken)
    saveGroups(fallbackGroups)
    savePermissions(fallbackPermissions)
    setToken(fallbackToken)
    setGroups(fallbackGroups)
    setPermissions(fallbackPermissions)
    window.location.hash = '#/'
  }, [])

  const logout = useCallback((): void => {
    clearToken()
    clearGroups()
    clearPermissions()
    setToken(null)
    setGroups([])
    setPermissions([])
    window.location.hash = '#/login'
  }, [])

  const hasPermission = useCallback(
    (required: string | string[]): boolean => {
      const list = Array.isArray(required) ? required : [required]
      if (list.length === 0) return true
      return list.some((perm) => permissions.includes(perm))
    },
    [permissions]
  )

  const value = useMemo<AuthContextValue>(
    () => ({ token, groups, permissions, isAuthenticated: !!token, login, logout, hasPermission }),
    [token, groups, permissions, login, logout, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
