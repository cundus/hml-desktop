import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface BranchConfig {
  deviceId: string
  branchId: string | null
  branchName: string | null
  headBranchId: string | null
  headBranchName: string | null
  isHeadBranch: boolean
  cloudDbUrl: string | null
  managerId: string | null
  managerName: string | null
  isConfigured: boolean
}

export interface BranchConfigContextType {
  config: BranchConfig | null
  loading: boolean
  error: string | null
  /** The store ID to filter queries by. Null means show all (HQ level). */
  storeId: string | null
  /** Whether user is at head branch (can see all stores) */
  isHeadBranch: boolean
  /** Refresh the config from backend */
  refresh: () => Promise<void>
}

const BranchConfigContext = createContext<BranchConfigContextType | null>(null)

export function BranchConfigProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [config, setConfig] = useState<BranchConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const res = await window.api.db.appConfig.get()
      if (res.success && res.data) {
        setConfig(res.data)
      } else {
        setError(res.error ?? 'Failed to load branch config')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  // Compute storeId for filtering
  // If HQ, return null (no filter = see all)
  // If branch, return branchId
  const storeId = config?.isHeadBranch ? null : (config?.branchId ?? null)
  const isHeadBranch = config?.isHeadBranch ?? false

  return (
    <BranchConfigContext.Provider
      value={{
        config,
        loading,
        error,
        storeId,
        isHeadBranch,
        refresh: loadConfig
      }}
    >
      {children}
    </BranchConfigContext.Provider>
  )
}

export default BranchConfigContext
