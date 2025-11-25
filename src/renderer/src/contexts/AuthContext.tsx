import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const existing = getToken()
    if (existing) setToken(existing)
    const existingGroups = getGroups()
    if (existingGroups.length) setGroups(existingGroups)
    const existingPermissions = getPermissions()
    if (existingPermissions.length) setPermissions(existingPermissions)
    setIsReady(true)
  }, [])
  const login = useCallback(async (creds: Credentials): Promise<void> => {
    try {
      const res = await window.api.db.auth.login(creds.identifier, creds.password)
      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Login gagal')
      }

      const t = res.data.token
      const g = res.data.groups ?? []
      const p = res.data.permissions ?? []

      saveToken(t)
      saveGroups(g)
      savePermissions(p)
      setToken(t)
      setGroups(g)
      setPermissions(p)
      window.location.hash = '#/'
    } catch (e) {
      // TODO: surface error via UI state; for now, simple alert
      alert('Email atau kata sandi salah')
    }
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
    () => ({ token, groups, permissions, isAuthenticated: !!token, isReady, login, logout, hasPermission }),
    [token, groups, permissions, isReady, login, logout, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
