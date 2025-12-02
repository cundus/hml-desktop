import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { db } from './api'

// Custom APIs for renderer
const api = {
  openMasterCustomerWindow: (): void => {
    ipcRenderer.invoke('open-master-customer-window').catch((error) => {
      console.error('Failed to open master customer window', error)
    })
  },

  // Database API - organized by feature
  db
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
