import { useState, useEffect, useCallback } from 'react'
import type { DeviceConfig } from '../../../preload/api/app-config'

interface BranchConfigState {
  config: DeviceConfig | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to access the current branch/device configuration
 * Use this to get the branch ID for filtering queries
 */
export default function useBranchConfig(): BranchConfigState {
  const [config, setConfig] = useState<DeviceConfig | null>(null)
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
    loadConfig()
  }, [loadConfig])

  return {
    config,
    loading,
    error,
    refresh: loadConfig
  }
}

/**
 * Get the store ID to use for filtering queries
 * Returns null if user is at HQ level (can see all stores)
 * Returns the branch's store ID if user is at branch level
 */
export function useStoreFilter(): {
  storeId: string | null
  isHeadBranch: boolean
  loading: boolean
} {
  const { config, loading } = useBranchConfig()

  return {
    storeId: config?.isHeadBranch ? null : config?.branchId ?? null,
    isHeadBranch: config?.isHeadBranch ?? false,
    loading
  }
}
