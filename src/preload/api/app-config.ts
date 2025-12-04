import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export interface DeviceConfig {
  deviceId: string
  branchId: string | null
  branchName: string | null
  headBranchId: string | null
  headBranchName: string | null
  isHeadBranch: boolean
  cloudDbUrl: string | null
  managerId: string | null
  managerName: string | null
  isConfigured: boolean
}

export interface SetupDeviceConfig {
  branchId: string
  branchName: string
  headBranchId?: string
  headBranchName?: string
  isHeadBranch: boolean
  cloudDbUrl?: string
  managerId?: string
  managerName?: string
}

export const appConfigApi = {
  /**
   * Get device configuration
   */
  get: () => ipcRenderer.invoke('app:config:get') as Promise<ApiResponse<DeviceConfig>>,

  /**
   * Check if device is configured
   */
  isConfigured: () =>
    ipcRenderer.invoke('app:config:isConfigured') as Promise<ApiResponse<boolean>>,

  /**
   * Setup device configuration (first-time setup)
   */
  setup: (config: SetupDeviceConfig) =>
    ipcRenderer.invoke('app:config:setup', config) as Promise<ApiResponse<DeviceConfig>>,

  /**
   * Update cloud database URL
   */
  setCloudDbUrl: (url: string) =>
    ipcRenderer.invoke('app:config:setCloudDbUrl', url) as Promise<ApiResponse<void>>,

  /**
   * Reset configuration
   */
  reset: () => ipcRenderer.invoke('app:config:reset') as Promise<ApiResponse<void>>,

  /**
   * Get a specific config value
   */
  getValue: (key: string) =>
    ipcRenderer.invoke('app:config:getValue', key) as Promise<ApiResponse<string | null>>,

  /**
   * Set a specific config value
   */
  setValue: (key: string, value: string | null) =>
    ipcRenderer.invoke('app:config:setValue', key, value) as Promise<ApiResponse<void>>
}
