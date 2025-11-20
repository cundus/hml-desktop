import { ipcRenderer } from 'electron'
import { ApiResponse, SyncStatus, SyncResult } from './types'

// Sync API
export const syncApi = {
  initCloud: (cloudDatabaseUrl: string) => 
    ipcRenderer.invoke('db:sync:initCloud', cloudDatabaseUrl) as Promise<ApiResponse<void>>,
  
  disconnect: () => 
    ipcRenderer.invoke('db:sync:disconnect') as Promise<ApiResponse<void>>,
  
  fullSync: () => 
    ipcRenderer.invoke('db:sync:fullSync') as Promise<ApiResponse<SyncResult>>,
  
  pullFromCloud: () => 
    ipcRenderer.invoke('db:sync:pullFromCloud') as Promise<ApiResponse<{ count: number; conflicts: number }>>,
  
  pushToCloud: () => 
    ipcRenderer.invoke('db:sync:pushToCloud') as Promise<ApiResponse<{ count: number; conflicts: number }>>,
  
  initialSync: () => 
    ipcRenderer.invoke('db:sync:initialSync') as Promise<ApiResponse<SyncResult>>,
  
  getStatus: () => 
    ipcRenderer.invoke('db:sync:getStatus') as Promise<ApiResponse<SyncStatus>>
}
