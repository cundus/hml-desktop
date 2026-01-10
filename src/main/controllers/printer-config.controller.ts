import { ipcMain } from 'electron'
import {
  PrinterConfigService,
  CreatePrinterConfigDto,
  UpdatePrinterConfigDto,
  PrinterPurpose
} from '../services/printer-config.service'

export function registerPrinterConfigController(service: PrinterConfigService): void {
  ipcMain.handle('db:printerConfig:getAll', async () => {
    try {
      const configs = await service.getAll()
      return { success: true, data: configs }
    } catch (error) {
      console.error('Error getting printer configs:', error)
      return { success: false, error: 'Failed to get printer configurations' }
    }
  })

  ipcMain.handle('db:printerConfig:findById', async (_, id: string) => {
    try {
      const config = await service.findById(id)
      return { success: true, data: config }
    } catch (error) {
      console.error('Error finding printer config:', error)
      return { success: false, error: 'Failed to find printer configuration' }
    }
  })

  ipcMain.handle('db:printerConfig:getDefaultForPurpose', async (_, purpose: PrinterPurpose) => {
    try {
      const config = await service.getDefaultForPurpose(purpose)
      return { success: true, data: config }
    } catch (error) {
      console.error('Error getting default printer:', error)
      return { success: false, error: 'Failed to get default printer' }
    }
  })

  ipcMain.handle('db:printerConfig:getByPurpose', async (_, purpose: PrinterPurpose) => {
    try {
      const configs = await service.getByPurpose(purpose)
      return { success: true, data: configs }
    } catch (error) {
      console.error('Error getting printers by purpose:', error)
      return { success: false, error: 'Failed to get printers' }
    }
  })

  ipcMain.handle('db:printerConfig:create', async (_, data: CreatePrinterConfigDto) => {
    try {
      const config = await service.create(data)
      return { success: true, data: config }
    } catch (error) {
      console.error('Error creating printer config:', error)
      return { success: false, error: 'Failed to create printer configuration' }
    }
  })

  ipcMain.handle('db:printerConfig:update', async (_, id: string, data: UpdatePrinterConfigDto) => {
    try {
      const config = await service.update(id, data)
      return { success: true, data: config }
    } catch (error) {
      console.error('Error updating printer config:', error)
      return { success: false, error: 'Failed to update printer configuration' }
    }
  })

  ipcMain.handle('db:printerConfig:delete', async (_, id: string) => {
    try {
      const success = await service.delete(id)
      return { success, data: success }
    } catch (error) {
      console.error('Error deleting printer config:', error)
      return { success: false, error: 'Failed to delete printer configuration' }
    }
  })

  ipcMain.handle('db:printerConfig:setDefault', async (_, id: string) => {
    try {
      const success = await service.setDefault(id)
      return { success, data: success }
    } catch (error) {
      console.error('Error setting default printer:', error)
      return { success: false, error: 'Failed to set default printer' }
    }
  })
}
