/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { CustomerCategoryCloudService } from '../services/customer-category-cloud.service'
import { CreateCustomerCategoryDto, UpdateCustomerCategoryDto } from '../types/dto'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class CustomerCategoryController {
  constructor(
    private db: Database,
    private customerCategoryService: CustomerCategoryCloudService
  ) {}

  /**
   * Register all IPC handlers for customer category operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:customerCategories:getAll', requirePermission(this.db, 'master.customer-category.view', this.getAll.bind(this)))
    ipcMain.handle('db:customerCategories:getById', requirePermission(this.db, 'master.customer-category.view', this.getById.bind(this)))
    ipcMain.handle('db:customerCategories:create', requirePermission(this.db, 'master.customer-category.create', this.create.bind(this)))
    ipcMain.handle('db:customerCategories:update', requirePermission(this.db, 'master.customer-category.edit', this.update.bind(this)))
    ipcMain.handle('db:customerCategories:softDelete', requirePermission(this.db, 'master.customer-category.delete', this.softDelete.bind(this)))
    ipcMain.handle('db:customerCategories:restore', requirePermission(this.db, 'master.customer-category.delete', this.restore.bind(this)))
  }

  /**
   * Get all customer categories
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const categories = await this.customerCategoryService.findAll()
      return {
        success: true,
        data: categories
      }
    } catch (error) {
      console.error('Error fetching customer categories:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer categories'
      }
    }
  }

  /**
   * Get customer category by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const category = await this.customerCategoryService.findById(id)
      if (!category) {
        return {
          success: false,
          error: 'Customer category not found'
        }
      }
      return {
        success: true,
        data: category
      }
    } catch (error) {
      console.error('Error fetching customer category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer category'
      }
    }
  }

  /**
   * Create new customer category
   */
  private async create(
    _event: IpcMainInvokeEvent,
    data: CreateCustomerCategoryDto
  ): Promise<ApiResponse> {
    try {
      const category = await this.customerCategoryService.create(data)
      return {
        success: true,
        data: category,
        message: 'Customer category created successfully'
      }
    } catch (error) {
      console.error('Error creating customer category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer category'
      }
    }
  }

  /**
   * Update customer category
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateCustomerCategoryDto
  ): Promise<ApiResponse> {
    try {
      const category = await this.customerCategoryService.update(id, data)
      return {
        success: true,
        data: category,
        message: 'Customer category updated successfully'
      }
    } catch (error) {
      console.error('Error updating customer category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update customer category'
      }
    }
  }

  /**
   * Soft delete customer category
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const category = await this.customerCategoryService.softDelete(id)
      return {
        success: true,
        data: category,
        message: 'Customer category deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting customer category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete customer category'
      }
    }
  }

  /**
   * Restore soft-deleted customer category
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const category = await this.customerCategoryService.restore(id)
      return {
        success: true,
        data: category,
        message: 'Customer category restored successfully'
      }
    } catch (error) {
      console.error('Error restoring customer category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore customer category'
      }
    }
  }
}
