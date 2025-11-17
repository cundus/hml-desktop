import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  openMasterCustomerWindow: (): void => {
    ipcRenderer.invoke('open-master-customer-window').catch((error) => {
      console.error('Failed to open master customer window', error)
    })
  },

  // Database API - Users
  db: {
    users: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:users:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:users:getById', id)
      },
      create: async (data: { name: string; email: string; password: string }) => {
        return await ipcRenderer.invoke('db:users:create', data)
      },
      update: async (id: string, data: { name?: string; email?: string }) => {
        return await ipcRenderer.invoke('db:users:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:users:softDelete', id)
      }
    },
    products: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:products:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:products:getById', id)
      },
      create: async (data: {
        sku: string
        name: string
        description?: string
        unit: string
        cost: number
        categoryId?: string
      }) => {
        return await ipcRenderer.invoke('db:products:create', data)
      },
      update: async (
        id: string,
        data: {
          name?: string
          description?: string
          cost?: number
          isActive?: boolean
        }
      ) => {
        return await ipcRenderer.invoke('db:products:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:products:softDelete', id)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
