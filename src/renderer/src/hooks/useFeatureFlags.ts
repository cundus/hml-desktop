import { useState, useEffect } from 'react'

export interface FeatureFlags {
  enableMultiUomPricing: boolean
}

const defaultFlags: FeatureFlags = {
  enableMultiUomPricing: true // Default to enabled
}

/**
 * Hook to access feature flags
 * Loads flags from app config on mount
 */
export function useFeatureFlags(): {
  flags: FeatureFlags
  loading: boolean
  setMultiUomPricing: (enabled: boolean) => Promise<void>
} {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFlags = async (): Promise<void> => {
      try {
        const res = await window.api.db.appConfig.getFeatureFlags()
        if (res.success && res.data) {
          setFlags(res.data)
        }
      } catch (err) {
        console.error('Failed to load feature flags:', err)
      } finally {
        setLoading(false)
      }
    }

    void loadFlags()
  }, [])

  const setMultiUomPricing = async (enabled: boolean): Promise<void> => {
    try {
      await window.api.db.appConfig.setMultiUomPricing(enabled)
      setFlags((prev) => ({ ...prev, enableMultiUomPricing: enabled }))
    } catch (err) {
      console.error('Failed to set multi-UOM pricing flag:', err)
    }
  }

  return { flags, loading, setMultiUomPricing }
}
