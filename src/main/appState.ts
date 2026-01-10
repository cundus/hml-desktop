/**
 * Application State Module
 * Stores references to key services for use across the main process
 */

import { ShiftService } from './services/shift.service'
import { SyncService } from './services/sync.service'

let shiftService: ShiftService | null = null
let syncService: SyncService | null = null

export function setAppServices(shift: ShiftService, sync: SyncService): void {
  shiftService = shift
  syncService = sync
}

export function getShiftService(): ShiftService | null {
  return shiftService
}

export function getSyncService(): SyncService | null {
  return syncService
}

export interface CloseGuardStatus {
  canClose: boolean
  hasOpenShift: boolean
  shiftUserName?: string
  unsyncedCount: number
  isCloudConnected: boolean
}

export async function checkCloseGuard(): Promise<CloseGuardStatus> {
  const result: CloseGuardStatus = {
    canClose: true,
    hasOpenShift: false,
    unsyncedCount: 0,
    isCloudConnected: false
  }

  // Check for open shifts
  if (shiftService) {
    try {
      const shiftStatus = await shiftService.hasAnyOpenShift()
      result.hasOpenShift = shiftStatus.hasOpen
      if (shiftStatus.shift) {
        result.shiftUserName = shiftStatus.shift.userName
      }
    } catch (error) {
      console.error('Failed to check shift status:', error)
    }
  }

  // Check for unsynced data
  if (syncService) {
    try {
      result.isCloudConnected = syncService.isCloudConnected()
      if (result.isCloudConnected) {
        result.unsyncedCount = syncService.getUnsyncedRecordsCount()
      }
    } catch (error) {
      console.error('Failed to check sync status:', error)
    }
  }

  // Determine if close is allowed without warning
  result.canClose = !result.hasOpenShift && (result.unsyncedCount === 0 || !result.isCloudConnected)

  return result
}
