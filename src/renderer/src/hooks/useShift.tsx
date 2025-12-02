import { ShiftContextValue } from '@renderer/contexts/ShiftContext'
import { createContext, useContext } from 'react'

export const ShiftContext = createContext<ShiftContextValue | null>(null)

export function useShift(): ShiftContextValue {
  const context = useContext(ShiftContext)
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider')
  }
  return context
}
