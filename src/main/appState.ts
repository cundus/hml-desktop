/**
 * Application State Module
 * Stores references to key services for use across the main process
 */

import { ShiftService } from './services/shift.service'
import { QueueService } from './services/queue.service'
import { getConnectivity } from './services/connectivity.service'

let shiftService: ShiftService | null = null
let queueService: QueueService | null = null

export function setAppServices(shift: ShiftService, queue: QueueService): void {
  shiftService = shift
  queueService = queue
}

export function getShiftService(): ShiftService | null {
  return shiftService
}

export function getQueueService(): QueueService | null {
  return queueService
}

export interface CloseGuardStatus {
  canClose: boolean
  hasOpenShift: boolean
  shiftUserName?: string
  pendingQueueCount: number
  isCloudConnected: boolean
}

export async function checkCloseGuard(): Promise<CloseGuardStatus> {
  const result: CloseGuardStatus = {
    canClose: true,
    hasOpenShift: false,
    pendingQueueCount: 0,
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

  // Check connectivity and pending queue
  try {
    result.isCloudConnected = getConnectivity().isOnline()
    if (queueService) {
      result.pendingQueueCount = queueService.getPendingCount()
    }
  } catch (error) {
    console.error('Failed to check connectivity/queue status:', error)
  }

  // Determine if close is allowed without warning
  // Allow close if: no open shift AND (queue is empty OR offline)
  result.canClose =
    !result.hasOpenShift && (result.pendingQueueCount === 0 || !result.isCloudConnected)

  return result
}
