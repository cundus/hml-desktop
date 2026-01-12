import { ipcMain } from 'electron'
import { SalesPersonService } from '../services/sales-person.service'

export class SalesPersonController {
  constructor(private salesPersonService: SalesPersonService) {}

  registerHandlers(): void {
    // Get all sales persons
    ipcMain.handle('db:salesPersons:getAll', async () => {
      try {
        const data = await this.salesPersonService.findAll()
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Get active sales persons only
    ipcMain.handle('db:salesPersons:getActive', async () => {
      try {
        const data = await this.salesPersonService.findActive()
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Get by ID
    ipcMain.handle('db:salesPersons:getById', async (_, id: string) => {
      try {
        const data = await this.salesPersonService.findById(id)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Create
    ipcMain.handle('db:salesPersons:create', async (_, data) => {
      try {
        const result = await this.salesPersonService.create(data)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Update
    ipcMain.handle('db:salesPersons:update', async (_, id: string, data) => {
      try {
        const result = await this.salesPersonService.update(id, data)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    // Soft delete
    ipcMain.handle('db:salesPersons:delete', async (_, id: string) => {
      try {
        const success = await this.salesPersonService.softDelete(id)
        return { success, data: success }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })
  }
}
