/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { CategoryCloudService } from '../services/category-cloud.service'
import { CreateCategoryDto, UpdateCategoryDto } from '../types/dto'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class CategoryController {
  constructor(
    private db: Database,
    private categoryService: CategoryCloudService
  ) {}

  /**
   * Register all IPC handlers for category operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:categories:getAll', requirePermission(this.db, 'master.category.view', this.getAll.bind(this)))
    ipcMain.handle('db:categories:getById', requirePermission(this.db, 'master.category.view', this.getById.bind(this)))
    ipcMain.handle('db:categories:create', requirePermission(this.db, 'master.category.create', this.create.bind(this)))
    ipcMain.handle('db:categories:update', requirePermission(this.db, 'master.category.edit', this.update.bind(this)))
    ipcMain.handle('db:categories:delete', requirePermission(this.db, 'master.category.delete', this.delete.bind(this)))
  }

  /**
   * Get all categories
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const categories = await this.categoryService.findAll()
      return {
        success: true,
        data: categories
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      }
    }
  }

  /**
   * Get category by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const category = await this.categoryService.findById(id)
      if (!category) {
        return {
          success: false,
          error: 'Category not found'
        }
      }
      return {
        success: true,
        data: category
      }
    } catch (error) {
      console.error('Error fetching category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category'
      }
    }
  }

  /**
   * Create new category
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateCategoryDto): Promise<ApiResponse> {
    try {
      const category = await this.categoryService.create(data)
      return {
        success: true,
        data: category,
        message: 'Category created successfully'
      }
    } catch (error) {
      console.error('Error creating category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category'
      }
    }
  }

  /**
   * Update category
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateCategoryDto
  ): Promise<ApiResponse> {
    try {
      const category = await this.categoryService.update(id, data)
      return {
        success: true,
        data: category,
        message: 'Category updated successfully'
      }
    } catch (error) {
      console.error('Error updating category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category'
      }
    }
  }

  /**
   * Delete category (Hard Delete)
   */
  private async delete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const category = await this.categoryService.delete(id)
      return {
        success: true,
        data: category,
        message: 'Category permanently deleted'
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category'
      }
    }
  }
}
