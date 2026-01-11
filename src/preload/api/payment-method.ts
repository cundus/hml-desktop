import { ipcRenderer } from 'electron'

export interface PaymentMethod {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncedAt: Date | null
  deletedAt: Date | null
}

export interface CreatePaymentMethodDto {
  name: string
  isActive?: boolean
}

export interface UpdatePaymentMethodDto {
  name?: string
  isActive?: boolean
}

export const paymentMethodApi = {
  getAll: () =>
    ipcRenderer.invoke('paymentMethods:getAll') as Promise<{
      success: boolean
      data?: PaymentMethod[]
      error?: string
    }>,
  getActive: () =>
    ipcRenderer.invoke('paymentMethods:getActive') as Promise<{
      success: boolean
      data?: PaymentMethod[]
      error?: string
    }>,
  getById: (id: string) =>
    ipcRenderer.invoke('paymentMethods:getById', id) as Promise<{
      success: boolean
      data?: PaymentMethod
      error?: string
    }>,
  create: (data: CreatePaymentMethodDto) =>
    ipcRenderer.invoke('paymentMethods:create', data) as Promise<{
      success: boolean
      data?: PaymentMethod
      error?: string
    }>,
  update: (id: string, data: UpdatePaymentMethodDto) =>
    ipcRenderer.invoke('paymentMethods:update', id, data) as Promise<{
      success: boolean
      data?: PaymentMethod
      error?: string
    }>,
  delete: (id: string) =>
    ipcRenderer.invoke('paymentMethods:delete', id) as Promise<{
      success: boolean
      data?: PaymentMethod
      error?: string
    }>
}
