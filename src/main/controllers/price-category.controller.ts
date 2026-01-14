import { ipcMain } from 'electron'
import {
  PriceCategoryCloudService,
  PriceCategory,
  CreatePriceCategoryDto,
  UpdatePriceCategoryDto
} from '../services/price-category-cloud.service'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class PriceCategoryController {
  constructor(private service: PriceCategoryCloudService) {}

  registerHandlers(): void {
    ipcMain.handle('db:priceCategories:getAll', async (): Promise<ApiResponse<PriceCategory[]>> => {
      try {
        const data = await this.service.getAll()
        return { success: true, data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle(
      'db:priceCategories:getById',
      async (_, id: string): Promise<ApiResponse<PriceCategory>> => {
        try {
          const data = await this.service.getById(id)
          if (!data) {
            return { success: false, error: 'Price category not found' }
          }
          return { success: true, data }
        } catch (error) {
          return { success: false, error: (error as Error).message }
        }
      }
    )

    ipcMain.handle(
      'db:priceCategories:create',
      async (_, data: CreatePriceCategoryDto): Promise<ApiResponse<PriceCategory>> => {
        try {
          const created = await this.service.create(data)
          return { success: true, data: created }
        } catch (error) {
          return { success: false, error: (error as Error).message }
        }
      }
    )

    ipcMain.handle(
      'db:priceCategories:update',
      async (_, id: string, data: UpdatePriceCategoryDto): Promise<ApiResponse<PriceCategory>> => {
        try {
          const updated = await this.service.update(id, data)
          return { success: true, data: updated }
        } catch (error) {
          return { success: false, error: (error as Error).message }
        }
      }
    )

    ipcMain.handle(
      'db:priceCategories:delete',
      async (_, id: string): Promise<ApiResponse<void>> => {
        try {
          await this.service.delete(id)
          return { success: true }
        } catch (error) {
          return { success: false, error: (error as Error).message }
        }
      }
    )
  }
}
