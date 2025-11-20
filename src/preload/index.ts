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
    },
    // Categories API
    categories: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:categories:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:categories:getById', id)
      },
      create: async (data: { name: string }) => {
        return await ipcRenderer.invoke('db:categories:create', data)
      },
      update: async (id: string, data: { name?: string }) => {
        return await ipcRenderer.invoke('db:categories:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:categories:softDelete', id)
      },
      restore: async (id: string) => {
        return await ipcRenderer.invoke('db:categories:restore', id)
      }
    },
    // Suppliers API
    suppliers: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:suppliers:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:suppliers:getById', id)
      },
      create: async (data: { name: string; phone?: string; address?: string }) => {
        return await ipcRenderer.invoke('db:suppliers:create', data)
      },
      update: async (id: string, data: { name?: string; phone?: string; address?: string }) => {
        return await ipcRenderer.invoke('db:suppliers:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:suppliers:softDelete', id)
      },
      restore: async (id: string) => {
        return await ipcRenderer.invoke('db:suppliers:restore', id)
      }
    },
    // Stores API
    stores: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:stores:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:stores:getById', id)
      },
      getByCode: async (code: string) => {
        return await ipcRenderer.invoke('db:stores:getByCode', code)
      },
      create: async (data: { code: string; name: string; address?: string; type: string }) => {
        return await ipcRenderer.invoke('db:stores:create', data)
      },
      update: async (id: string, data: { code?: string; name?: string; address?: string; type?: string }) => {
        return await ipcRenderer.invoke('db:stores:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:stores:softDelete', id)
      },
      restore: async (id: string) => {
        return await ipcRenderer.invoke('db:stores:restore', id)
      }
    },
    // Customer Categories API
    customerCategories: {
      getAll: async () => {
        return await ipcRenderer.invoke('db:customerCategories:getAll')
      },
      getById: async (id: string) => {
        return await ipcRenderer.invoke('db:customerCategories:getById', id)
      },
      create: async (data: { name: string }) => {
        return await ipcRenderer.invoke('db:customerCategories:create', data)
      },
      update: async (id: string, data: { name?: string }) => {
        return await ipcRenderer.invoke('db:customerCategories:update', id, data)
      },
      softDelete: async (id: string) => {
        return await ipcRenderer.invoke('db:customerCategories:softDelete', id)
      },
      restore: async (id: string) => {
        return await ipcRenderer.invoke('db:customerCategories:restore', id)
      }
    },
    // Sync API
    sync: {
      connect: async (cloudDatabaseUrl: string) => {
        return await ipcRenderer.invoke('sync:connect', cloudDatabaseUrl)
      },
      disconnect: async () => {
        return await ipcRenderer.invoke('sync:disconnect')
      },
      fullSync: async () => {
        return await ipcRenderer.invoke('sync:full')
      },
      pull: async () => {
        return await ipcRenderer.invoke('sync:pull')
      },
      push: async () => {
        return await ipcRenderer.invoke('sync:push')
      },
      initialSync: async () => {
        return await ipcRenderer.invoke('sync:initial')
      },
      getStatus: async () => {
        return await ipcRenderer.invoke('sync:status')
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
