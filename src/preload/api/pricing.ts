import { ipcRenderer } from 'electron'
import type { ApiResponse } from './types'

export interface ResolvedPrice {
  productId: string
  uomId: string
  priceCategoryId: string
  storeId: string
  price: string
  source: 'store' | 'default'
}

export interface AvailableCategoryPrice {
  priceCategoryId: string
  priceCategoryName: string
  price: string
  source: 'store' | 'default'
}

export interface PriceCategory {
  id: string
  name: string
}

export interface ProductUom {
  id: string
  productId: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
}

export interface ProductUomCategoryPrice {
  id: string
  productId: string
  uomId: string
  priceCategoryId: string
  price: string
}

export interface StoreProductUomPrice {
  id: string
  productId: string
  uomId: string
  priceCategoryId: string
  storeId: string
  price: string
}

export const pricingApi = {
  resolvePrice: (args: {
    productId: string
    uomId: string
    priceCategoryId: string
    storeId: string
  }) =>
    ipcRenderer.invoke('db:pricing:resolvePrice', args) as Promise<ApiResponse<ResolvedPrice>>,

  getAvailableCategoryPrices: (args: { productId: string; uomId: string; storeId: string }) =>
    ipcRenderer.invoke('db:pricing:getAvailableCategoryPrices', args) as Promise<
      ApiResponse<AvailableCategoryPrice[]>
    >,

  getPriceCategories: () =>
    ipcRenderer.invoke('db:pricing:getPriceCategories') as Promise<
      ApiResponse<PriceCategory[]>
    >,

  // Admin endpoints
  getProductUomsByProduct: (productId: string) =>
    ipcRenderer.invoke('db:pricing:getProductUomsByProduct', productId) as Promise<
      ApiResponse<ProductUom[]>
    >,

  getCategoryPrices: (args: { productId: string; uomId: string }) =>
    ipcRenderer.invoke('db:pricing:getCategoryPrices', args) as Promise<
      ApiResponse<ProductUomCategoryPrice[]>
    >,

  upsertCategoryPrice: (args: {
    productId: string
    uomId: string
    priceCategoryId: string
    price: string
  }) =>
    ipcRenderer.invoke('db:pricing:upsertCategoryPrice', args) as Promise<
      ApiResponse<ProductUomCategoryPrice>
    >,

  upsertStorePrice: (args: {
    productId: string
    uomId: string
    priceCategoryId: string
    storeId: string
    price: string
  }) =>
    ipcRenderer.invoke('db:pricing:upsertStorePrice', args) as Promise<
      ApiResponse<StoreProductUomPrice>
    >,

  createProductUom: (args: {
    productId: string
    uomId: string
    conversionFactor: number
    isBaseUnit: boolean
  }) =>
    ipcRenderer.invoke('db:pricing:createProductUom', args) as Promise<ApiResponse<ProductUom>>,

  deleteProductUom: (id: string) =>
    ipcRenderer.invoke('db:pricing:deleteProductUom', id) as Promise<ApiResponse<void>>
}
