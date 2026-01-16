import { ipcRenderer } from 'electron'
import { ApiResponse } from './types'

export type PrinterType = 'thermal' | 'hvs' | 'dotmatrix'
export type PaperSize = '58mm' | '80mm' | 'A4' | 'A5'
export type PrinterPurpose = 'receipt' | 'report' | 'invoice' | 'do'

export interface PrinterConfig {
  id: string
  name: string
  printerName: string
  printerType: PrinterType
  paperSize: PaperSize
  purpose: PrinterPurpose
  isDefault: boolean
  copies: number
  createdAt: Date
  updatedAt: Date
}

export interface CreatePrinterConfigDto {
  name: string
  printerName: string
  printerType: PrinterType
  paperSize: PaperSize
  purpose: PrinterPurpose
  isDefault?: boolean
  copies?: number
}

export interface UpdatePrinterConfigDto {
  name?: string
  printerName?: string
  printerType?: PrinterType
  paperSize?: PaperSize
  purpose?: PrinterPurpose
  isDefault?: boolean
  copies?: number
}

export const printerConfigApi = {
  getAll: () =>
    ipcRenderer.invoke('db:printerConfig:getAll') as Promise<ApiResponse<PrinterConfig[]>>,

  findById: (id: string) =>
    ipcRenderer.invoke('db:printerConfig:findById', id) as Promise<
      ApiResponse<PrinterConfig | null>
    >,

  getDefaultForPurpose: (purpose: PrinterPurpose) =>
    ipcRenderer.invoke('db:printerConfig:getDefaultForPurpose', purpose) as Promise<
      ApiResponse<PrinterConfig | null>
    >,

  getByPurpose: (purpose: PrinterPurpose) =>
    ipcRenderer.invoke('db:printerConfig:getByPurpose', purpose) as Promise<
      ApiResponse<PrinterConfig[]>
    >,

  create: (data: CreatePrinterConfigDto) =>
    ipcRenderer.invoke('db:printerConfig:create', data) as Promise<ApiResponse<PrinterConfig>>,

  update: (id: string, data: UpdatePrinterConfigDto) =>
    ipcRenderer.invoke('db:printerConfig:update', id, data) as Promise<
      ApiResponse<PrinterConfig | null>
    >,

  delete: (id: string) =>
    ipcRenderer.invoke('db:printerConfig:delete', id) as Promise<ApiResponse<boolean>>,

  setDefault: (id: string) =>
    ipcRenderer.invoke('db:printerConfig:setDefault', id) as Promise<ApiResponse<boolean>>
}
