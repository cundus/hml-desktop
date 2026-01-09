import { ShiftContext } from '@renderer/hooks/useShift'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import useAuth from '../hooks/useAuth'

export interface CashierShift {
  id: string
  userId: string
  storeId: string
  storeName: string
  status: 'OPEN' | 'CLOSED'
  initialCash: string
  closingCash: string | null
  expectedCash: string | null
  difference: string | null
  notes: string | null
  openedAt: Date
  closedAt: Date | null
  userName?: string
}

export interface ShiftContextValue {
  currentShift: CashierShift | null
  isLoading: boolean
  hasOpenShift: boolean
  openShift: (initialCash: string, storeId: string) => Promise<void>
  closeShift: (closingCash: string, notes?: string) => Promise<void>
  refreshShift: () => Promise<void>
}

export function ShiftProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { token, isAuthenticated } = useAuth()
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshShift = useCallback(async () => {
    if (!token) {
      setCurrentShift(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await window.api.db.shifts.getCurrentShift(token)
      if (response.success && response.data) {
        setCurrentShift(response.data)
      } else {
        setCurrentShift(null)
      }
    } catch (error) {
      console.error('Failed to fetch current shift:', error)
      setCurrentShift(null)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated) {
      refreshShift()
    } else {
      setCurrentShift(null)
      setIsLoading(false)
    }
  }, [isAuthenticated, refreshShift])

  const openShift = useCallback(
    async (initialCash: string, storeId: string) => {
      if (!token) throw new Error('Not authenticated')

      const response = await window.api.db.shifts.open({
        userId: token,
        storeId,
        initialCash
      })

      if (!response.success) {
        throw new Error(response.error ?? 'Failed to open shift')
      }

      setCurrentShift(response.data)
    },
    [token]
  )

  const closeShift = useCallback(
    async (closingCash: string, notes?: string) => {
      if (!token || !currentShift) throw new Error('No active shift')

      const shiftId = currentShift.id

      const response = await window.api.db.shifts.close(shiftId, token, {
        closingCash,
        notes
      })

      if (!response.success) {
        throw new Error(response.error ?? 'Failed to close shift')
      }

      // Fetch shift summary and print settlement report
      try {
        const summaryRes = await window.api.db.shifts.getSummary(shiftId)
        if (summaryRes.success && summaryRes.data) {
          const printResult = await window.api.db.printer.printSettlementReport(summaryRes.data)
          if (!printResult.success) {
            console.error('Failed to print settlement report:', printResult.error)
          }
        }
      } catch (printError) {
        console.error('Error printing settlement report:', printError)
        // Don't throw - shift is already closed, printing is secondary
      }

      setCurrentShift(null)
    },
    [token, currentShift]
  )

  const value = useMemo<ShiftContextValue>(
    () => ({
      currentShift,
      isLoading,
      hasOpenShift: !!currentShift && currentShift.status === 'OPEN',
      openShift,
      closeShift,
      refreshShift
    }),
    [currentShift, isLoading, openShift, closeShift, refreshShift]
  )

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
}
