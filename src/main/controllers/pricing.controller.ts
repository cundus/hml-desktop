import { ipcMain } from 'electron'
import { PricingCloudService } from '../services/pricing-cloud.service'

export class PricingController {
  constructor(private pricingService: PricingCloudService) {}

  registerHandlers(): void {
    // Resolve single price
    ipcMain.handle(
      'db:pricing:resolvePrice',
      async (
        _,
        args: { productId: string; uomId: string; priceCategoryId: string; storeId: string }
      ) => {
        try {
          const result = await this.pricingService.resolvePrice(
            args.productId,
            args.uomId,
            args.priceCategoryId,
            args.storeId
          )
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // List available category prices for a product+UOM in a store
    ipcMain.handle(
      'db:pricing:getAvailableCategoryPrices',
      async (_, args: { productId: string; uomId: string; storeId: string }) => {
        try {
          const result = await this.pricingService.getAvailableCategoryPrices(
            args.productId,
            args.uomId,
            args.storeId
          )
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Admin: list price categories
    ipcMain.handle('db:pricing:getPriceCategories', async () => {
      try {
        const result = await this.pricingService.getPriceCategories()
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Admin: list product UOMs for a product
    ipcMain.handle('db:pricing:getProductUomsByProduct', async (_, productId: string) => {
      try {
        const result = await this.pricingService.getProductUomsByProduct(productId)
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get ALL Product UOMs (for Inventory Overview Smart Display)
    ipcMain.handle('db:pricing:getAllProductUoms', async () => {
      try {
        const result = await this.pricingService.getAllProductUoms()
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })



    // Admin: list HQ category prices for product+UOM
    ipcMain.handle(
      'db:pricing:getCategoryPrices',
      async (_, args: { productId: string; uomId: string }) => {
        try {
          const result = await this.pricingService.getCategoryPrices(args.productId, args.uomId)
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Admin: upsert HQ category price for product+UOM
    ipcMain.handle(
      'db:pricing:upsertCategoryPrice',
      async (
        _,
        args: { productId: string; uomId: string; priceCategoryId: string; price: string }
      ) => {
        try {
          const result = await this.pricingService.upsertCategoryPrice(
            args.productId,
            args.uomId,
            args.priceCategoryId,
            args.price
          )
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    ipcMain.handle(
      'db:pricing:upsertStorePrice',
      async (
        _,
        args: {
          productId: string
          uomId: string
          priceCategoryId: string
          storeId: string
          price: string
        }
      ) => {
        try {
          const result = await this.pricingService.upsertStorePrice(
            args.productId,
            args.uomId,
            args.priceCategoryId,
            args.storeId,
            args.price
          )
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Admin: create product UOM
    ipcMain.handle(
      'db:pricing:createProductUom',
      async (
        _,
        args: {
          productId: string
          uomId: string
          conversionFactor: number
          isBaseUnit: boolean
        }
      ) => {
        try {
          const result = await this.pricingService.createProductUom(
            args.productId,
            args.uomId,
            args.conversionFactor,
            args.isBaseUnit
          )
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Admin: delete product UOM
    ipcMain.handle('db:pricing:deleteProductUom', async (_, id: string) => {
      try {
        await this.pricingService.deleteProductUom(id)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Bulk: get all products' base UOM RETAIL prices
    ipcMain.handle('db:pricing:getAllBaseRetailPrices', async () => {
      try {
        const result = await this.pricingService.getAllBaseRetailPrices()
        return { success: true, data: result }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Get effective cost for a UOM (with auto-calculate logic)
    ipcMain.handle(
      'db:pricing:getEffectiveCost',
      async (_, args: { productId: string; uomId: string }) => {
        try {
          const result = await this.pricingService.getEffectiveCost(args.productId, args.uomId)
          return { success: true, data: result }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Update cost for a UOM (with optional recalculate)
    ipcMain.handle(
      'db:pricing:updateProductUomCost',
      async (
        _,
        args: {
          productId: string
          uomId: string
          cost: number
          costOverride: boolean
          recalculateOthers?: boolean
        }
      ) => {
        try {
          await this.pricingService.updateProductUomCost(
            args.productId,
            args.uomId,
            args.cost,
            args.costOverride,
            args.recalculateOthers ?? false
          )
          return { success: true }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )

    // Copy prices from one store to another for a product
    ipcMain.handle(
      'db:pricing:copyProductPricesFromStore',
      async (
        _,
        args: {
          productId: string
          sourceStoreId: string
          targetStoreId: string
        }
      ) => {
        try {
          const result = await this.pricingService.copyProductPricesFromStore(
            args.productId,
            args.sourceStoreId,
            args.targetStoreId
          )
          return { success: true, data: { count: result } }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    )
  }
}
