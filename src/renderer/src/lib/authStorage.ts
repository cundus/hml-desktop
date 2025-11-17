const TOKEN_KEY = 'auth_token'
const GROUPS_KEY = 'auth_groups'
const PERMISSIONS_KEY = 'auth_permissions'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    return
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    return
  }
}

export function getGroups(): string[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function setGroups(groups: string[]): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
  } catch {
    return
  }
}

export function clearGroups(): void {
  try {
    localStorage.removeItem(GROUPS_KEY)
  } catch {
    return
  }
}

export function getPermissions(): string[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function setPermissions(permissions: string[]): void {
  try {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions))
  } catch {
    return
  }
}

export function clearPermissions(): void {
  try {
    localStorage.removeItem(PERMISSIONS_KEY)
  } catch {
    return
  }
}
