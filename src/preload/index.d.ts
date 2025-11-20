import { ElectronAPI } from '@electron-toolkit/preload'
import type { db } from './api'

export interface API {
  openMasterCustomerWindow: () => void
  db: typeof db
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
