import { ipcRenderer } from 'electron'

export interface QueueStats {
  pending: number
  failed: number
  isProcessing: boolean
  isOnline: boolean
}

export interface QueueItem {
  id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  entity: string
  payload: string
  createdAt: number
  retryCount: number
  lastError: string | null
  status: 'pending' | 'processing' | 'failed' | 'completed'
}

export const queueApi = {
  getStats: () =>
    ipcRenderer.invoke('queue:getStats') as Promise<{
      success: boolean
      data?: QueueStats
      error?: string
    }>,
  getAll: () =>
    ipcRenderer.invoke('queue:getAll') as Promise<{
      success: boolean
      data?: QueueItem[]
      error?: string
    }>,
  getPending: () =>
    ipcRenderer.invoke('queue:getPending') as Promise<{
      success: boolean
      data?: QueueItem[]
      error?: string
    }>,
  retryFailed: (id: string) =>
    ipcRenderer.invoke('queue:retryFailed', id) as Promise<{
      success: boolean
      message?: string
      error?: string
    }>,
  clearFailed: () =>
    ipcRenderer.invoke('queue:clearFailed') as Promise<{
      success: boolean
      message?: string
      error?: string
    }>,
  processNow: () =>
    ipcRenderer.invoke('queue:processNow') as Promise<{
      success: boolean
      message?: string
      error?: string
    }>
}
