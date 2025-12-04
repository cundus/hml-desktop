import { Transaction, TransactionItem } from './transaction.service'
import { AppConfigService } from './app-config.service'
import { ProductService } from './product.service'
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer')

export interface ReceiptConfig {
  printerName?: string
  paperWidth: number // 58 or 80 for thermal printers
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
}

export interface ReceiptData {
  transaction: Transaction
  items: Array<{
    name: string
    quantity: number
    price: string
    total: string
  }>
  subtotal: string
  discount: string
  tax: string
  total: string
  paidAmount?: string
  change?: string
}

export class ReceiptService {
  private printer: any
  private config: ReceiptConfig
  private printerInitialized = false

  constructor(
    private appConfigService: AppConfigService,
    private productService: ProductService
  ) {
    this.config = this.getDefaultConfig()
    void this.initializePrinter()
  }

  private getDefaultConfig(): ReceiptConfig {
    return {
      paperWidth: 58,
      storeName: 'PETSHOP MANAGEMENT SYSTEM',
      storeAddress: 'Jl. Contoh No. 123, Jakarta',
      storePhone: '(021) 123-4567',
      storeEmail: 'info@petshop.com'
    }
  }

  private async initializePrinter(): Promise<void> {
    try {
      this.printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'printer:auto', // Auto-detect printer
        driver: {
          thermal: {
            characterSet: 'SLOVENIA',
            codePage: 'PC860'
          }
        }
      })

      // Try to connect to printer
      const isConnected = await this.printer.isPrinterConnected()
      if (!isConnected) {
        console.warn('Thermal printer not connected, will use fallback')
      }
      this.printerInitialized = true
    } catch (error) {
      console.warn('Failed to initialize thermal printer:', error)
      this.printer = null
      this.printerInitialized = true
    }
  }

  private async waitForPrinterInitialization(): Promise<void> {
    const maxWaitTime = 5000 // 5 seconds max wait
    const startTime = Date.now()

    while (!this.printerInitialized && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (!this.printerInitialized) {
      console.warn('Printer initialization timeout, proceeding without printer')
      this.printerInitialized = true // Mark as initialized to prevent infinite wait
    }
  }

  private async fetchItemsWithProductNames(items: TransactionItem[]): Promise<
    Array<{
      name: string
      quantity: number
      price: string
      total: string
    }>
  > {
    const itemsWithNames: Array<{
      name: string
      quantity: number
      price: string
      total: string
    }> = []

    for (const item of items) {
      try {
        const product = await this.productService.findById(item.productId)
        const productName = product?.name || `Product ${item.productId}`

        itemsWithNames.push({
          name: productName,
          quantity: item.quantity,
          price: item.price,
          total: (parseFloat(item.price) * item.quantity).toString()
        })
      } catch (error) {
        console.warn(`Failed to fetch product ${item.productId}:`, error)
        itemsWithNames.push({
          name: `Product ${item.productId}`,
          quantity: item.quantity,
          price: item.price,
          total: (parseFloat(item.price) * item.quantity).toString()
        })
      }
    }

    return itemsWithNames
  }

  private formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  private generateReceiptText(data: ReceiptData): string {
    const { transaction, items, subtotal, discount, tax, total, paidAmount, change } = data
    const lines: string[] = []

    // Header
    lines.push(''.padEnd(32, '='))
    lines.push(this.config.storeName.padStart(16))
    lines.push(this.config.storeAddress.padStart(16))
    lines.push(this.config.storePhone.padStart(16))
    if (this.config.storeEmail) {
      lines.push(this.config.storeEmail.padStart(16))
    }
    lines.push(''.padEnd(32, '='))

    // Transaction info
    lines.push('')
    lines.push(`No: ${transaction.code}`)
    lines.push(`Tanggal: ${new Date(transaction.createdAt).toLocaleString('id-ID')}`)
    lines.push(`Kasir: ${transaction.userId || 'System'}`)

    // Payment method
    const paymentMethodMap: { [key: string]: string } = {
      cash: 'Tunai',
      card: 'Kartu',
      qris: 'QRIS',
      credit: 'Kredit'
    }
    lines.push(`Bayar: ${paymentMethodMap[transaction.paymentMethod] || transaction.paymentMethod}`)

    if (transaction.paymentMethod === 'credit' && transaction.paymentDeadline) {
      lines.push(
        `Jatuh Tempo: ${new Date(transaction.paymentDeadline).toLocaleDateString('id-ID')}`
      )
    }

    lines.push(''.padEnd(32, '-'))

    // Items
    lines.push('RINCIAN PEMBELANJAAN')
    lines.push(''.padEnd(32, '-'))

    items.forEach((item) => {
      const nameLines = this.wrapText(item.name, 20)
      nameLines.forEach((line, index) => {
        if (index === 0) {
          lines.push(
            `${line.padEnd(20)} ${item.quantity.toString().padStart(3)} ${this.formatCurrency(item.price).padStart(9)}`
          )
        } else {
          lines.push(`${line.padEnd(20)}   ${this.formatCurrency(item.price).padStart(9)}`)
        }
      })
    })

    lines.push(''.padEnd(32, '-'))

    // Totals
    lines.push(`Subtotal: ${this.formatCurrency(subtotal).padStart(20)}`)
    if (parseFloat(discount) > 0) {
      lines.push(`Diskon: ${this.formatCurrency(discount).padStart(22)}`)
    }
    if (parseFloat(tax) > 0) {
      lines.push(`Pajak: ${this.formatCurrency(tax).padStart(22)}`)
    }
    lines.push(`TOTAL: ${this.formatCurrency(total).padStart(21)}`)
    lines.push(''.padEnd(32, '='))

    // Payment details (for cash payments)
    if (transaction.paymentMethod === 'cash' && paidAmount) {
      lines.push(`Tunai: ${this.formatCurrency(paidAmount).padStart(20)}`)
      if (change) {
        lines.push(`Kembali: ${this.formatCurrency(change).padStart(18)}`)
      }
      lines.push(''.padEnd(32, '='))
    }

    // Footer
    lines.push('')
    lines.push('Terima kasih atas kunjungan Anda')
    lines.push('Barang yang sudah dibeli')
    lines.push('tidak dapat dikembalikan')
    lines.push('')
    lines.push(''.padEnd(32, '='))

    return lines.join('\n')
  }

  private wrapText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text]

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach((word) => {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    })

    if (currentLine) lines.push(currentLine)
    return lines
  }

  async printReceipt(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
    try {
      // Wait for printer initialization if not ready
      if (!this.printerInitialized) {
        await this.waitForPrinterInitialization()
      }

      // Fetch product names for receipt items
      const itemsWithNames = await this.fetchItemsWithProductNames(transaction.items || [])

      // Prepare receipt data
      const receiptData: ReceiptData = {
        transaction,
        items: itemsWithNames,
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        tax: transaction.tax,
        total: transaction.total
      }

      // Try thermal printer first
      if (this.printer) {
        const isConnected = await this.printer.isPrinterConnected()
        if (isConnected) {
          return await this.printWithThermalPrinter(receiptData)
        }
      }

      // Fallback to PDF/regular printer
      return await this.printWithElectronAPI(receiptData)
    } catch (error) {
      console.error('Receipt printing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown printing error'
      }
    }
  }

  private async printWithThermalPrinter(
    data: ReceiptData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const receiptText = this.generateReceiptText(data)

      // Configure printer
      this.printer.alignCenter()
      this.printer.setTextSize(0, 0) // Normal size
      this.printer.text(receiptText)
      this.printer.cut()

      // Execute print
      await this.printer.execute()

      return {
        success: true
      }
    } catch (error) {
      console.error('Thermal printer error:', error)
      // Fallback to Electron API
      return await this.printWithElectronAPI(data)
    }
  }

  private async printWithElectronAPI(
    data: ReceiptData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would be implemented using Electron's print API
      // For now, return success as placeholder
      console.log('Printing with Electron API (not implemented yet)')
      console.log('Receipt data:', this.generateReceiptText(data))

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Electron printing failed'
      }
    }
  }

  async updateConfig(config: Partial<ReceiptConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    // Save to app config
    await this.appConfigService.set('receipt.printerName', config.printerName || '')
    await this.appConfigService.set('receipt.paperWidth', (config.paperWidth || 58).toString())
    await this.appConfigService.set('receipt.storeName', config.storeName || '')
    await this.appConfigService.set('receipt.storeAddress', config.storeAddress || '')
    await this.appConfigService.set('receipt.storePhone', config.storePhone || '')
    await this.appConfigService.set('receipt.storeEmail', config.storeEmail || '')

    // Reinitialize printer if config changed
    if (config.printerName) {
      await this.initializePrinter()
    }
  }

  async getConfig(): Promise<ReceiptConfig> {
    return this.config
  }
}
