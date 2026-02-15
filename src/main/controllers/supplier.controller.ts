/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { SupplierCloudService } from '../services/supplier-cloud.service'
import { CreateSupplierDto, UpdateSupplierDto } from '../types/dto'
import { ApiResponse } from '../types/response'
import { requirePermission } from '../utils/auth-guard'
import { Database } from 'sql.js'

export class SupplierController {
  constructor(
    private db: Database,
    private supplierService: SupplierCloudService
  ) {}

  /**
   * Register all IPC handlers for supplier operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:suppliers:getAll', requirePermission(this.db, 'master.supplier.view', this.getAll.bind(this)))
    ipcMain.handle('db:suppliers:getById', requirePermission(this.db, 'master.supplier.view', this.getById.bind(this)))
    ipcMain.handle('db:suppliers:create', requirePermission(this.db, 'master.supplier.create', this.create.bind(this)))
    ipcMain.handle('db:suppliers:update', requirePermission(this.db, 'master.supplier.edit', this.update.bind(this)))
    ipcMain.handle('db:suppliers:softDelete', requirePermission(this.db, 'master.supplier.delete', this.softDelete.bind(this)))
    ipcMain.handle('db:suppliers:restore', requirePermission(this.db, 'master.supplier.delete', this.restore.bind(this)))
  }

  /**
   * Get all suppliers
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const suppliers = await this.supplierService.findAll()
      return {
        success: true,
        data: suppliers
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch suppliers'
      }
    }
  }

  /**
   * Get supplier by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const supplier = await this.supplierService.findById(id)
      if (!supplier) {
        return {
          success: false,
          error: 'Supplier not found'
        }
      }
      return {
        success: true,
        data: supplier
      }
    } catch (error) {
      console.error('Error fetching supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch supplier'
      }
    }
  }

  /**
   * Create new supplier
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateSupplierDto): Promise<ApiResponse> {
    try {
      const supplier = await this.supplierService.create(data)
      return {
        success: true,
        data: supplier,
        message: 'Supplier created successfully'
      }
    } catch (error) {
      console.error('Error creating supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create supplier'
      }
    }
  }

  /**
   * Update supplier
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateSupplierDto
  ): Promise<ApiResponse> {
    try {
      const supplier = await this.supplierService.update(id, data)
      return {
        success: true,
        data: supplier,
        message: 'Supplier updated successfully'
      }
    } catch (error) {
      console.error('Error updating supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update supplier'
      }
    }
  }

  /**
   * Soft delete supplier
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const supplier = await this.supplierService.softDelete(id)
      return {
        success: true,
        data: supplier,
        message: 'Supplier deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete supplier'
      }
    }
  }

  /**
   * Restore soft-deleted supplier
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const supplier = await this.supplierService.restore(id)
      return {
        success: true,
        data: supplier,
        message: 'Supplier restored successfully'
      }
    } catch (error) {
      console.error('Error restoring supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore supplier'
      }
    }
  }
}
