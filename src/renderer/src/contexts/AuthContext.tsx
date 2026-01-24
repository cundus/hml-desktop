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
  clearPermissions,
  getUserName,
  setUserName as saveUserName,
  clearUserName,
  getUserId,
  setUserId as saveUserId,
  clearUserId,
  getUserRole,
  setUserRole as saveUserRole,
  clearUserRole,
  getStoreId,
  setStoreId as saveStoreId,
  setStoreName as saveStoreName,
  clearStoreId,
  getStoreName,
  clearStoreName
} from '../lib/authStorage'
import { AuthContext, type AuthContextValue, type Credentials } from './authContextBase'

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const existing = getToken()
    if (existing) setToken(existing)
    const existingUserName = getUserName()
    if (existingUserName) setUserName(existingUserName)
    const existingUserId = getUserId()
    if (existingUserId) setUserId(existingUserId)
    const existingUserRole = getUserRole()
    if (existingUserRole) setUserRole(existingUserRole)
    const existingStoreId = getStoreId()
    if (existingStoreId) setStoreId(existingStoreId)
    const existingStoreName = getStoreName()
    if (existingStoreName) setStoreName(existingStoreName)
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
      const uName = res.data.userName ?? ''
      const uId = res.data.userId || res.data.id || null
      const uRole = res.data.userRole ?? ''
      const sId = res.data.storeId ?? null
      const sName = res.data.storeName ?? null
      const g = res.data.groups ?? []
      const p = res.data.permissions ?? []

      saveToken(t)
      saveUserName(uName)
      if (uId) saveUserId(uId)
      saveUserRole(uRole)
      if (sId) saveStoreId(sId)
      if (sName) saveStoreName(sName)
      saveGroups(g)
      savePermissions(p)
      setToken(t)
      setUserName(uName)
      setUserId(uId)
      setUserRole(uRole)
      setStoreId(sId)
      setStoreName(sName)
      setGroups(g)
      setPermissions(p)
      window.location.hash = '#/'
    } catch (err) {
      throw new Error((err as Error).message || 'Email atau kata sandi salah')
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Check for open shifts and unsynced data
      const status = await window.api.db.appConfig.checkCloseGuard()

      if (!status.canClose) {
        // Build warning messages
        const warnings: string[] = []
        if (status.hasOpenShift) {
          warnings.push(`Shift kasir "${status.shiftUserName || 'Unknown'}" masih terbuka`)
        }
        if (status.unsyncedCount > 0 && status.isCloudConnected) {
          warnings.push(`Ada ${status.unsyncedCount} record yang belum di-sync ke cloud`)
        }

        // Show confirmation dialog using React-friendly globalAlert
        const { globalAlert } = await import('../lib/globalAlert')
        const confirmed = await globalAlert.confirm(
          `Peringatan:\n${warnings.join('\n')}\n\nApakah Anda yakin ingin keluar?`
        )

        if (!confirmed) {
          return
        }
      }
    } catch (error) {
      console.error('Failed to check close guard:', error)
      // Continue with logout even if check fails
    }

    // Proceed with logout
    clearToken()
    clearUserName()
    clearUserId()
    clearUserRole()
    clearStoreId()
    clearStoreName()
    clearGroups()
    clearPermissions()
    setToken(null)
    setUserName(null)
    setUserId(null)
    setUserRole(null)
    setStoreId(null)
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
    () => ({
      storeName,
      token,
      userName,
      userId,
      userRole,
      storeId,
      groups,
      permissions,
      isAuthenticated: !!token,
      isReady,
      login,
      logout,
      hasPermission
    }),
    [
      token,
      userName,
      userId,
      userRole,
      storeId,
      storeName,
      groups,
      permissions,
      isReady,
      login,
      logout,
      hasPermission
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
