import { ipcMain } from 'electron'
import { AppConfigService, DeviceConfig } from '../services/app-config.service'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function registerAppConfigHandlers(service: AppConfigService): void {
  // Get device configuration
  ipcMain.handle('app:config:get', async (): Promise<ApiResponse<DeviceConfig>> => {
    try {
      const data = await service.getDeviceConfig()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Check if device is configured
  ipcMain.handle('app:config:isConfigured', async (): Promise<ApiResponse<boolean>> => {
    try {
      const data = await service.isConfigured()
      return { success: true, data }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Setup device configuration
  ipcMain.handle(
    'app:config:setup',
    async (
      _,
      config: {
        branchId: string
        branchName: string
        headBranchId?: string
        headBranchName?: string
        isHeadBranch: boolean
        cloudDbUrl?: string
      }
    ): Promise<ApiResponse<DeviceConfig>> => {
      try {
        const data = await service.setupDevice(config)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Update cloud database URL
  ipcMain.handle('app:config:setCloudDbUrl', async (_, url: string): Promise<ApiResponse<void>> => {
    try {
      await service.setCloudDbUrl(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Reset configuration
  ipcMain.handle('app:config:reset', async (): Promise<ApiResponse<void>> => {
    try {
      await service.resetConfig()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // Get a specific config value
  ipcMain.handle(
    'app:config:getValue',
    async (_, key: string): Promise<ApiResponse<string | null>> => {
      try {
        const data = await service.get(key)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Set a specific config value
  ipcMain.handle(
    'app:config:setValue',
    async (_, key: string, value: string | null): Promise<ApiResponse<void>> => {
      try {
        await service.set(key, value)
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )
}
