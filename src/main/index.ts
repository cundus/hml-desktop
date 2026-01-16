import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { disconnectDb } from './db'
import { bootstrap } from './bootstrap'
import { config } from 'dotenv'
import { checkCloseGuard, getQueueService } from './appState'
import { initAutoUpdater } from './updater'
import { getCloudDb } from './services/cloud-db.service'

// Load .env file for DATABASE_URL and other env vars
config()

let mainWindow: BrowserWindow | null = null
let forceClose = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  // Close guard - prevent closing with open shifts or unsynced data
  mainWindow.on('close', async (event) => {
    if (forceClose) return // Allow close if user confirmed force close

    const status = await checkCloseGuard()

    if (!status.canClose) {
      event.preventDefault()

      // Build warning message
      const warnings: string[] = []
      if (status.hasOpenShift) {
        warnings.push(`• Shift kasir "${status.shiftUserName || 'Unknown'}" masih terbuka`)
      }
      if (status.pendingQueueCount > 0 && status.isCloudConnected) {
        warnings.push(`• Ada ${status.pendingQueueCount} record dalam antrian sync`)
      }

      const buttons = ['Batal']
      if (status.pendingQueueCount > 0 && status.isCloudConnected) {
        buttons.push('Sync Sekarang')
      }
      buttons.push('Tetap Tutup')

      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        title: 'Peringatan Sebelum Menutup',
        message: 'Aplikasi tidak dapat ditutup karena:',
        detail: warnings.join('\n') + '\n\nApa yang ingin Anda lakukan?',
        buttons,
        defaultId: 0,
        cancelId: 0
      })

      const clickedButton = buttons[result.response]

      if (clickedButton === 'Sync Sekarang') {
        // Trigger queue processing
        try {
          const queueService = getQueueService()
          if (queueService) {
            await dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Sinkronisasi',
              message: 'Memproses antrian sinkronisasi...',
              detail: 'Silakan tunggu hingga selesai.',
              buttons: ['OK']
            })
            // Queue will be processed by QueueProcessorService automatically
            // Just show completion message
            await dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'Sinkronisasi',
              message: 'Antrian akan diproses di background.',
              detail: 'Anda dapat menutup aplikasi setelah queue kosong.',
              buttons: ['OK']
            })
          }
        } catch (error) {
          await dialog.showMessageBox(mainWindow!, {
            type: 'error',
            title: 'Gagal Sync',
            message: 'Sinkronisasi gagal.',
            detail: error instanceof Error ? error.message : 'Unknown error',
            buttons: ['OK']
          })
        }
      } else if (clickedButton === 'Tetap Tutup') {
        forceClose = true
        mainWindow?.close()
      }
      // 'Batal' does nothing, window stays open
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createMasterCustomerWindow(): void {
  console.log('createMasterCustomerWindow')
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/master-customer?add-customer=1`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'master-customer?add-customer=1'
    })
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Remove all application menus so no menu bar is shown
  Menu.setApplicationMenu(null)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Close guard check for logout validation
  ipcMain.handle('app:checkCloseGuard', async () => {
    return checkCloseGuard()
  })

  ipcMain.handle('open-master-customer-window', () => {
    createMasterCustomerWindow()
  })

  // Initialize services and controllers (registers all database IPC handlers)
  bootstrap()
    .then(() => {
      createWindow()
      // Initialize auto-updater after window is created
      if (mainWindow) {
        initAutoUpdater(mainWindow)
      }
    })
    .catch((err) => {
      console.error('Failed to bootstrap application:', err)
    })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up database connections before app quits
app.on('before-quit', async () => {
  // Disconnect cloud database
  try {
    await getCloudDb().disconnect()
    console.log('Cloud database disconnected')
  } catch (error) {
    console.error('Error disconnecting cloud database:', error)
  }
  // Then close local database
  disconnectDb()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
