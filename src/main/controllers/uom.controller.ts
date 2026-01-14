/* eslint-disable @typescript-eslint/no-unused-vars */
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { UomCloudService, CreateUomDto, UpdateUomDto } from '../services/uom-cloud.service'
import { ApiResponse } from '../types/response'

export class UomController {
  constructor(private uomService: UomCloudService) {}

  /**
   * Register all IPC handlers for UOM operations
   */
  registerHandlers(): void {
    ipcMain.handle('db:uoms:getAll', this.getAll.bind(this))
    ipcMain.handle('db:uoms:getById', this.getById.bind(this))
    ipcMain.handle('db:uoms:getByCode', this.getByCode.bind(this))
    ipcMain.handle('db:uoms:create', this.create.bind(this))
    ipcMain.handle('db:uoms:update', this.update.bind(this))
    ipcMain.handle('db:uoms:softDelete', this.softDelete.bind(this))
    ipcMain.handle('db:uoms:restore', this.restore.bind(this))
  }

  /**
   * Get all UOMs
   */
  private async getAll(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const uoms = await this.uomService.findAll()
      return {
        success: true,
        data: uoms
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch UOMs'
      }
    }
  }

  /**
   * Get UOM by ID
   */
  private async getById(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.findById(id)
      if (!uom) {
        return {
          success: false,
          error: 'UOM not found'
        }
      }
      return {
        success: true,
        data: uom
      }
    } catch (error) {
      console.error('Error fetching UOM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch UOM'
      }
    }
  }

  /**
   * Get UOM by code
   */
  private async getByCode(_event: IpcMainInvokeEvent, code: string): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.findByCode(code)
      if (!uom) {
        return {
          success: false,
          error: 'UOM not found'
        }
      }
      return {
        success: true,
        data: uom
      }
    } catch (error) {
      console.error('Error fetching UOM by code:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch UOM'
      }
    }
  }

  /**
   * Create new UOM
   */
  private async create(_event: IpcMainInvokeEvent, data: CreateUomDto): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.create(data)
      return {
        success: true,
        data: uom,
        message: 'UOM created successfully'
      }
    } catch (error) {
      console.error('Error creating UOM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create UOM'
      }
    }
  }

  /**
   * Update UOM
   */
  private async update(
    _event: IpcMainInvokeEvent,
    id: string,
    data: UpdateUomDto
  ): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.update(id, data)
      return {
        success: true,
        data: uom,
        message: 'UOM updated successfully'
      }
    } catch (error) {
      console.error('Error updating UOM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update UOM'
      }
    }
  }

  /**
   * Soft delete UOM
   */
  private async softDelete(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.softDelete(id)
      return {
        success: true,
        data: uom,
        message: 'UOM deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting UOM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete UOM'
      }
    }
  }

  /**
   * Restore soft-deleted UOM
   */
  private async restore(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      const uom = await this.uomService.restore(id)
      return {
        success: true,
        data: uom,
        message: 'UOM restored successfully'
      }
    } catch (error) {
      console.error('Error restoring UOM:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore UOM'
      }
    }
  }
}
