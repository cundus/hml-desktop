import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { PricingCloudService } from '../services/pricing-cloud.service'
import { requirePermission, requireAuth } from '../utils/auth-guard'
import { Database } from 'sql.js'
import { ApiResponse } from '../types/response'

export class PricingController {
  constructor(
    private db: Database,
    private pricingService: PricingCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('db:pricing:resolvePrice', requireAuth(this.db, this.resolvePrice.bind(this)))
    ipcMain.handle('db:pricing:getAvailableCategoryPrices', requireAuth(this.db, this.getAvailableCategoryPrices.bind(this)))
    ipcMain.handle('db:pricing:getPriceCategories', requireAuth(this.db, this.getPriceCategories.bind(this)))
    ipcMain.handle('db:pricing:getProductUomsByProduct', requireAuth(this.db, this.getProductUomsByProduct.bind(this)))
    ipcMain.handle('db:pricing:getProductUomsForStore', requireAuth(this.db, this.getProductUomsForStore.bind(this)))
    ipcMain.handle('db:pricing:getAllProductUoms', requireAuth(this.db, this.getAllProductUoms.bind(this)))
    ipcMain.handle('db:pricing:getCategoryPrices', requireAuth(this.db, this.getCategoryPrices.bind(this)))
    ipcMain.handle('db:pricing:upsertCategoryPrice', requirePermission(this.db, 'pricing.product.edit', this.upsertCategoryPrice.bind(this)))
    ipcMain.handle('db:pricing:upsertStorePrice', requirePermission(this.db, 'pricing.product.edit', this.upsertStorePrice.bind(this)))
    ipcMain.handle('db:pricing:createProductUom', requirePermission(this.db, 'pricing.product.edit', this.createProductUom.bind(this)))
    ipcMain.handle('db:pricing:deleteProductUom', requirePermission(this.db, 'pricing.product.edit', this.deleteProductUom.bind(this)))
    ipcMain.handle('db:pricing:getAllBaseRetailPrices', requireAuth(this.db, this.getAllBaseRetailPrices.bind(this)))
    ipcMain.handle('db:pricing:getEffectiveCost', requireAuth(this.db, this.getEffectiveCost.bind(this)))
    ipcMain.handle('db:pricing:updateProductUomCost', requirePermission(this.db, 'pricing.product.edit', this.updateProductUomCost.bind(this)))
    ipcMain.handle('db:pricing:copyProductPricesFromStore', requirePermission(this.db, 'pricing.product.edit', this.copyProductPricesFromStore.bind(this)))
  }

  private async resolvePrice(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.resolvePrice(args.productId, args.uomId, args.priceCategoryId, args.storeId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getAvailableCategoryPrices(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getAvailableCategoryPrices(args.productId, args.uomId, args.storeId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getPriceCategories(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getPriceCategories()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getProductUomsByProduct(_event: IpcMainInvokeEvent, productId: string): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getProductUomsByProduct(productId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getProductUomsForStore(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getProductUomsForStore(args.productId, args.storeId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getAllProductUoms(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getAllProductUoms()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getCategoryPrices(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getCategoryPrices(args.productId, args.uomId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async upsertCategoryPrice(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.upsertCategoryPrice(args.productId, args.uomId, args.priceCategoryId, args.price)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async upsertStorePrice(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.upsertStorePrice(args.productId, args.uomId, args.priceCategoryId, args.storeId, args.price)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async createProductUom(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.createProductUom(args.productId, args.uomId, args.conversionFactor, args.isBaseUnit)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async deleteProductUom(_event: IpcMainInvokeEvent, id: string): Promise<ApiResponse> {
    try {
      await this.pricingService.deleteProductUom(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getAllBaseRetailPrices(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getAllBaseRetailPrices()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getEffectiveCost(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.getEffectiveCost(args.productId, args.uomId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async updateProductUomCost(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      await this.pricingService.updateProductUomCost(args.productId, args.uomId, args.cost, args.costOverride, args.recalculateOthers ?? false)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async copyProductPricesFromStore(_event: IpcMainInvokeEvent, args: any): Promise<ApiResponse> {
    try {
      const result = await this.pricingService.copyProductPricesFromStore(args.productId, args.sourceStoreId, args.targetStoreId)
      return { success: true, data: { count: result } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
