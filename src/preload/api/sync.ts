import { ipcRenderer } from 'electron'
import { ApiResponse, SyncStatus, SyncResult } from './types'

// Sync API
export const syncApi = {
  // Connect to cloud
  connect: (cloudDatabaseUrl: string) =>
    ipcRenderer.invoke('sync:connect', cloudDatabaseUrl) as Promise<ApiResponse<boolean>>,

  // Disconnect from cloud
  disconnect: () =>
    ipcRenderer.invoke('sync:disconnect') as Promise<ApiResponse<boolean>>,

  // Full sync (pull + push)
  fullSync: () =>
    ipcRenderer.invoke('sync:full', undefined) as Promise<ApiResponse<SyncResult>>,

  // Pull only
  pull: () =>
    ipcRenderer.invoke('sync:pull', undefined) as Promise<ApiResponse<SyncResult>>,

  // Push only
  push: () =>
    ipcRenderer.invoke('sync:push', undefined) as Promise<ApiResponse<SyncResult>>,

  // Initial sync
  initialSync: () =>
    ipcRenderer.invoke('sync:initial', undefined) as Promise<ApiResponse<SyncResult>>,

  // Status
  getStatus: () =>
    ipcRenderer.invoke('sync:status', undefined) as Promise<ApiResponse<SyncStatus>>
}
