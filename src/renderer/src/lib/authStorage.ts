const TOKEN_KEY = 'auth_token'
const ROLES_KEY = 'auth_roles'

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

export function getRoles(): string[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export function setRoles(roles: string[]): void {
  try {
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
  } catch {
    return
  }
}

export function clearRoles(): void {
  try {
    localStorage.removeItem(ROLES_KEY)
  } catch {
    return
  }
}
