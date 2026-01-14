import { ipcMain } from 'electron'
import { CustomerCloudService } from '../services/customer-cloud.service'

export class CustomerController {
  constructor(private customerService: CustomerCloudService) {}

  registerHandlers(): void {
    // Get all customers
    ipcMain.handle('db:customers:getAll', async () => {
      try {
        const customers = await this.customerService.findAll()
        return { success: true, data: customers }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get customer by ID
    ipcMain.handle('db:customers:getById', async (_, id: string) => {
      try {
        const customer = await this.customerService.findById(id)
        return { success: true, data: customer }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Search customers
    ipcMain.handle('db:customers:search', async (_, query: string) => {
      try {
        const customers = await this.customerService.search(query)
        return { success: true, data: customers }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get customers by category
    ipcMain.handle('db:customers:getByCategory', async (_, categoryId: string) => {
      try {
        const customers = await this.customerService.findByCategory(categoryId)
        return { success: true, data: customers }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Create customer
    ipcMain.handle('db:customers:create', async (_, data) => {
      try {
        const customer = await this.customerService.create(data)
        return { success: true, data: customer }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Update customer
    ipcMain.handle('db:customers:update', async (_, id: string, data) => {
      try {
        const customer = await this.customerService.update(id, data)
        return { success: true, data: customer }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Soft delete customer
    ipcMain.handle('db:customers:delete', async (_, id: string) => {
      try {
        const customer = await this.customerService.softDelete(id)
        return { success: true, data: customer }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Restore customer
    ipcMain.handle('db:customers:restore', async (_, id: string) => {
      try {
        const customer = await this.customerService.restore(id)
        return { success: true, data: customer }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}
