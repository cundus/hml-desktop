import { ipcRenderer } from 'electron'
import type { ApiResponse } from './types'

export interface PointSetting {
  id: string
  pointPerRupiah: string
  minTransaction: string
  redemptionValue: string
  minRedemption: number
  maxRedemptionPercent: number
  expiryMonths: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PointHistory {
  id: string
  customerId: string
  transactionId: string | null
  type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST'
  points: number
  balanceAfter: number
  notes: string | null
  expiresAt: Date | null
  createdAt: Date
}

export const pointsApi = {
  // Settings
  getSettings: (): Promise<ApiResponse<PointSetting | null>> =>
    ipcRenderer.invoke('points:getSettings'),

  updateSettings: (
    data: Partial<Omit<PointSetting, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<PointSetting>> => ipcRenderer.invoke('points:updateSettings', data),

  // Customer points
  getCustomerPoints: (customerId: string): Promise<ApiResponse<number>> =>
    ipcRenderer.invoke('points:getCustomerPoints', customerId),

  addPoints: (input: {
    customerId: string
    transactionId: string
    transactionTotal: number
  }): Promise<ApiResponse<PointHistory | null>> => ipcRenderer.invoke('points:addPoints', input),

  redeemPoints: (input: {
    customerId: string
    transactionId: string
    points: number
  }): Promise<ApiResponse<{ discount: number; history: PointHistory } | null>> =>
    ipcRenderer.invoke('points:redeemPoints', input),

  // History
  getHistory: (customerId: string, limit?: number): Promise<ApiResponse<PointHistory[]>> =>
    ipcRenderer.invoke('points:getHistory', customerId, limit),

  // Calculations
  calculateEarned: (transactionTotal: number): Promise<ApiResponse<number>> =>
    ipcRenderer.invoke('points:calculateEarned', transactionTotal),

  calculateRedemption: (points: number, transactionTotal: number): Promise<ApiResponse<number>> =>
    ipcRenderer.invoke('points:calculateRedemption', points, transactionTotal)
}
