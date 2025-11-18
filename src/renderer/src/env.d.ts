/// <reference types="vite/client" />

import { DatabaseAPI } from 'src/preload'

export {}

declare global {
  interface Window {
    electron: typeof import('@electron-toolkit/preload').electronAPI
    api: {
      openMasterCustomerWindow: () => void
      db: DatabaseAPI
    }
  }
}
