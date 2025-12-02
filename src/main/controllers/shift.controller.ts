import { ipcMain } from 'electron'
import { ShiftService, OpenShiftDto, CloseShiftDto } from '../services/shift.service'

export function registerShiftHandlers(service: ShiftService): void {
  ipcMain.handle('db:shifts:getCurrentShift', async (_, userId: string) => {
    try {
      const data = await service.getCurrentShift(userId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:shifts:getCurrentStoreShift', async (_, storeId: string) => {
    try {
      const data = await service.getCurrentStoreShift(storeId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('db:shifts:findById', async (_, id: string) => {
    try {
      const data = await service.findById(id)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(
    'db:shifts:getAll',
    async (
      _,
      filters?: {
        userId?: string
        storeId?: string
        status?: 'OPEN' | 'CLOSED'
        fromDate?: number
        toDate?: number
      }
    ) => {
      try {
        const data = await service.getAll(filters)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle('db:shifts:open', async (_, data: OpenShiftDto) => {
    try {
      const result = await service.openShift(data)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(
    'db:shifts:close',
    async (_, shiftId: string, userId: string, data: CloseShiftDto) => {
      try {
        const result = await service.closeShift(shiftId, userId, data)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle(
    'db:shifts:takeover',
    async (_, shiftId: string, newUserId: string, pin: string) => {
      try {
        const result = await service.takeoverShift(shiftId, newUserId, pin)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  ipcMain.handle('db:shifts:getHistory', async (_, shiftId: string) => {
    try {
      const data = await service.getShiftHistory(shiftId)
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
}
