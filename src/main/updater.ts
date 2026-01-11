import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, app } from 'electron'

/**
 * Initialize auto-updater for the application
 * Uses electron-updater with generic provider pointing to VPS
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Don't check for updates in development
  if (!app.isPackaged) {
    console.log('Skipping auto-update check in development mode')
    return
  }

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Log update events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', async (info) => {
    console.log('Update available:', info.version)
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Tersedia',
      message: `Versi ${info.version} tersedia. Download sekarang?`,
      detail: `Versi saat ini: ${app.getVersion()}`,
      buttons: ['Ya, Download', 'Nanti'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      console.log('User accepted update, starting download...')
      autoUpdater.downloadUpdate()
    }
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`)
    // Optionally send progress to renderer
    mainWindow.webContents.send('update-download-progress', progress)
  })

  autoUpdater.on('update-downloaded', async () => {
    console.log('Update downloaded')
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Siap',
      message: 'Update sudah didownload. Restart sekarang untuk menginstall?',
      buttons: ['Restart Sekarang', 'Nanti'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      console.log('User accepted restart, installing update...')
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
    // Don't show error dialog to user for network errors (silent fail)
  })

  // Check for updates after a short delay (let app fully initialize)
  setTimeout(() => {
    console.log('Initiating update check...')
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Failed to check for updates:', err)
    })
  }, 3000)
}

/**
 * Manually trigger update check (can be called from menu or button)
 */
export async function checkForUpdatesManually(mainWindow: BrowserWindow): Promise<void> {
  if (!app.isPackaged) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Development Mode',
      message: 'Auto-update tidak tersedia dalam mode development.'
    })
    return
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result || !result.updateInfo) {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Tidak Ada Update',
        message: `Anda sudah menggunakan versi terbaru (${app.getVersion()}).`
      })
    }
  } catch (error) {
    console.error('Manual update check failed:', error)
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Error',
      message: 'Gagal memeriksa update. Periksa koneksi internet Anda.'
    })
  }
}
