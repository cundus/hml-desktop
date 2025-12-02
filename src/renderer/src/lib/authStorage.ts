const TOKEN_KEY = 'auth_token'
const GROUPS_KEY = 'auth_groups'
const PERMISSIONS_KEY = 'auth_permissions'
const USER_NAME_KEY = 'auth_user_name'
const USER_ROLE_KEY = 'auth_user_role'
const STORE_ID_KEY = 'auth_store_id'
const STORE_NAME_KEY = 'auth_store_name'

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

export function getUserName(): string | null {
  try {
    return localStorage.getItem(USER_NAME_KEY)
  } catch {
    return null
  }
}

export function setUserName(name: string): void {
  try {
    localStorage.setItem(USER_NAME_KEY, name)
  } catch {
    return
  }
}

export function clearUserName(): void {
  try {
    localStorage.removeItem(USER_NAME_KEY)
  } catch {
    return
  }
}

export function getUserRole(): string | null {
  try {
    return localStorage.getItem(USER_ROLE_KEY)
  } catch {
    return null
  }
}

export function setUserRole(role: string): void {
  try {
    localStorage.setItem(USER_ROLE_KEY, role)
  } catch {
    return
  }
}

export function clearUserRole(): void {
  try {
    localStorage.removeItem(USER_ROLE_KEY)
  } catch {
    return
  }
}

export function getStoreId(): string | null {
  try {
    return localStorage.getItem(STORE_ID_KEY)
  } catch {
    return null
  }
}

export function setStoreId(storeId: string): void {
  try {
    localStorage.setItem(STORE_ID_KEY, storeId)
  } catch {
    return
  }
}

export function clearStoreId(): void {
  try {
    localStorage.removeItem(STORE_ID_KEY)
  } catch {
    return
  }
}

export function getStoreName(): string | null {
  try {
    return localStorage.getItem(STORE_NAME_KEY)
  } catch {
    return null
  }
}

export function setStoreName(storeName: string): void {
  try {
    localStorage.setItem(STORE_NAME_KEY, storeName)
  } catch {
    return
  }
}

export function clearStoreName(): void {
  try {
    localStorage.removeItem(STORE_NAME_KEY)
  } catch {
    return
  }
}
