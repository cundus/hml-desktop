import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ProductLocationCloudService } from '../services/product-location-cloud.service'
import { StockTransactionCloudService } from '../services/stock-transaction-cloud.service'
import {
  StockAdjustmentCloudService,
  StockAdjustment
} from '../services/stock-adjustment-cloud.service'
import { ProductCloudService } from '../services/product-cloud.service'
import { StoreCloudService } from '../services/store-cloud.service'
import { PurchaseOrderCloudService } from '../services/purchase-order-cloud.service'
import { ApiResponse } from '../types/response'

export class InventoryController {
  constructor(
    private productLocationService: ProductLocationCloudService,
    private stockTransactionService: StockTransactionCloudService,
    private stockAdjustmentService: StockAdjustmentCloudService,
    private productService: ProductCloudService,
    private storeService: StoreCloudService,
    private purchaseOrderService: PurchaseOrderCloudService
  ) {}

  registerHandlers(): void {
    ipcMain.handle('inventory:stock-overview', this.getStockOverview.bind(this))
    ipcMain.handle('inventory:stock-transactions', this.getStockTransactions.bind(this))
    ipcMain.handle('inventory:stock-adjustments', this.getStockAdjustments.bind(this))
    ipcMain.handle('inventory:create-adjustment', this.createAdjustment.bind(this))
    ipcMain.handle('inventory:low-stock', this.getLowStock.bind(this))
    ipcMain.handle('inventory:bulk-create-adjustments', this.bulkCreateAdjustments.bind(this))
    ipcMain.handle('inventory:product-details', this.getProductStockDetails.bind(this))
  }

  private async getStockOverview(
    _event: IpcMainInvokeEvent,
    storeId?: string
  ): Promise<ApiResponse> {
    try {
      const stores = storeId ? [storeId] : (await this.storeService.findAll()).map((s) => s.id)

      const stockOverview: unknown[] = []

      for (const store of stores) {
        const locations = await this.productLocationService.findByStoreId(store)
        const orderedPOs = await this.purchaseOrderService.findByStoreId(store)
        const orderedQuantityMap = new Map<string, number>()

        for (const po of orderedPOs) {
          if (po.status === 'ORDERED' && po.items) {
            for (const item of po.items) {
              const current = orderedQuantityMap.get(item.productId) || 0
              orderedQuantityMap.set(item.productId, current + item.quantity)
            }
          }
        }

        for (const location of locations) {
          const product = await this.productService.findById(location.productId)
          if (product) {
            stockOverview.push({
              id: location.id,
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              unit: product.unit,
              storeId: location.storeId,
              quantity: location.quantity,
              reservedQuantity: location.reservedQuantity,
              availableQuantity: location.quantity - location.reservedQuantity,
              orderedQuantity: orderedQuantityMap.get(product.id) || 0,
              lowStockThreshold: 10, // TODO: Make this configurable
              isLowStock: location.quantity - location.reservedQuantity < 10
            })
          }
        }
      }

      return { success: true, data: stockOverview }
    } catch (error) {
      console.error('Error fetching stock overview:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getStockTransactions(_event: IpcMainInvokeEvent): Promise<ApiResponse> {
    try {
      const transactions = await this.stockTransactionService.findAll()
      const enrichedTransactions: unknown[] = []

      for (const transaction of transactions) {
        const product = await this.productService.findById(transaction.productId)
        const store = await this.storeService.findById(transaction.storeId)

        enrichedTransactions.push({
          ...transaction,
          productName: product?.name || 'Unknown',
          storeName: store?.name || 'Unknown'
        })
      }

      return { success: true, data: enrichedTransactions }
    } catch (error) {
      console.error('Error fetching stock transactions:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getStockAdjustments(
    _event: IpcMainInvokeEvent,
    filters?: { productId?: string; storeId?: string }
  ): Promise<ApiResponse> {
    try {
      let adjustments = await this.stockAdjustmentService.findAll()

      if (filters?.productId) {
        adjustments = adjustments.filter((a) => a.productId === filters.productId)
      }
      if (filters?.storeId) {
        adjustments = adjustments.filter((a) => a.storeId === filters.storeId)
      }

      const enrichedAdjustments: unknown[] = []

      for (const adjustment of adjustments) {
        const product = await this.productService.findById(adjustment.productId)
        const store = await this.storeService.findById(adjustment.storeId)

        enrichedAdjustments.push({
          ...adjustment,
          productName: product?.name || 'Unknown',
          storeName: store?.name || 'Unknown'
        })
      }

      return { success: true, data: enrichedAdjustments }
    } catch (error) {
      console.error('Error fetching stock adjustments:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async createAdjustment(
    _event: IpcMainInvokeEvent,
    data: {
      productId: string
      storeId: string
      difference: number
      note?: string
      performedBy: string
    }
  ): Promise<ApiResponse> {
    try {
      const adjustment = await this.stockAdjustmentService.create(data)

      // Update product location
      await this.productLocationService.adjustQuantity(
        data.productId,
        data.storeId,
        data.difference
      )

      // Create stock transaction
      await this.stockTransactionService.create({
        productId: data.productId,
        storeId: data.storeId,
        type: 'ADJUSTMENT',
        quantity: data.difference,
        reference: `ADJ-${adjustment.id}`,
        performedBy: data.performedBy
      })

      return { success: true, data: adjustment }
    } catch (error) {
      console.error('Error creating stock adjustment:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getLowStock(
    _event: IpcMainInvokeEvent,
    storeId?: string,
    threshold: number = 10
  ): Promise<ApiResponse> {
    try {
      const stores = storeId ? [storeId] : (await this.storeService.findAll()).map((s) => s.id)
      const lowStockItems: unknown[] = []

      for (const store of stores) {
        const locations = await this.productLocationService.findByStoreId(store)

        for (const location of locations) {
          const product = await this.productService.findById(location.productId)
          if (product) {
            const availableQuantity = location.quantity - location.reservedQuantity
            if (availableQuantity < threshold) {
              lowStockItems.push({
                id: location.id,
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                unit: product.unit,
                storeId: location.storeId,
                quantity: location.quantity,
                reservedQuantity: location.reservedQuantity,
                availableQuantity: availableQuantity,
                lowStockThreshold: threshold,
                isLowStock: true
              })
            }
          }
        }
      }

      return { success: true, data: lowStockItems }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async getProductStockDetails(
    _event: IpcMainInvokeEvent,
    productId: string,
    storeId: string
  ): Promise<ApiResponse> {
    try {
      // 1. Get Product Details
      const product = await this.productService.findById(productId)
      if (!product) throw new Error('Product not found')

      // 2. Get Store Details
      const store = await this.storeService.findById(storeId)
      if (!store) throw new Error('Store not found')

      // 3. Get Total Stock (ProductLocation)
      const locations = await this.productLocationService.findByStoreId(storeId)
      const location = locations.find((l) => l.productId === productId)
      const totalStock = location ? location.quantity : 0
      const reservedStock = location ? location.reservedQuantity : 0

      // 4. Get Active Batches (FIFO Layers)
      const activeBatches = await this.stockTransactionService.getActiveBatches(productId, storeId)
      const activeBatchesSum = activeBatches.reduce((sum, b) => sum + b.quantity, 0)

      // Use the higher of location.quantity or calculated active batches
      // This handles cases where ProductLocation might be out of sync with Transactions
      const adjustedTotal = Math.max(totalStock, activeBatchesSum)

      // 5. Get Recent Transactions (History)
      const allTransactions = await this.stockTransactionService.findByProductId(productId)
      const storeTransactions = allTransactions.filter((t) => t.storeId === storeId).slice(0, 50) // Limit to last 50 transactions

      return {
        success: true,
        data: {
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit
          },
          store: {
            id: store.id,
            name: store.name
          },
          stock: {
            total: adjustedTotal,
            reserved: reservedStock,
            available: adjustedTotal - reservedStock
          },
          batches: activeBatches,
          history: storeTransactions
        }
      }
    } catch (error) {
      console.error('Error fetching product stock details:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async bulkCreateAdjustments(
    _event: IpcMainInvokeEvent,
    adjustments: Array<{
      productId: string
      storeId: string
      difference: number
      note?: string
      performedBy: string
    }>
  ): Promise<ApiResponse> {
    try {
      const results: StockAdjustment[] = []

      for (const adj of adjustments) {
        const adjustment = await this.stockAdjustmentService.create(adj)

        await this.productLocationService.adjustQuantity(adj.productId, adj.storeId, adj.difference)

        await this.stockTransactionService.create({
          productId: adj.productId,
          storeId: adj.storeId,
          type: 'ADJUSTMENT',
          quantity: adj.difference,
          reference: `BULK-ADJ-${Date.now()}`,
          performedBy: adj.performedBy
        })

        results.push(adjustment)
      }

      return { success: true, data: results }
    } catch (error) {
      console.error('Error creating bulk stock adjustments:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
