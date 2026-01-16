import { useContext } from 'react'
import BranchConfigContext, { type BranchConfigContextType } from '../contexts/BranchConfigContext'

/**
 * Hook to access the current branch/device configuration
 * Backed by BranchConfigContext.
 */
export default function useBranchConfig(): BranchConfigContextType {
  const context = useContext(BranchConfigContext)
  if (!context) {
    throw new Error('useBranchConfig must be used within a BranchConfigProvider')
  }
  return context
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
  const { storeId, isHeadBranch, loading } = useBranchConfig()

  return {
    storeId,
    isHeadBranch,
    loading
  }
}
