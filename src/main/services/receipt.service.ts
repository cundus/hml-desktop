import { BrowserWindow } from 'electron'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Transaction, TransactionItem } from './transaction.service'
import { AppConfigService } from './app-config.service'
import { ProductService } from './product.service'

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

export interface ExpenseReportData {
  date: string
  shiftId: string
  shiftName: string
  expenses: Array<{
    item: string
    quantity: number
    price: string
    total: string
    description?: string
  }>
  totalExpenses: number
  expenseCount: number
}

export interface PrinterStatus {
  connected: boolean
  printerName: string
  availablePrinters?: string[]
}

export class ReceiptService {
  private config: ReceiptConfig

  constructor(
    private appConfigService: AppConfigService,
    private productService: ProductService
  ) {
    this.config = this.getDefaultConfig()
    void this.loadConfig()
  }

  // Reuse ShiftSummary interface structure locally for type safety without circular dependency
  // or export it from a shared types file if possible. For now, defining compatible structure.
  // ... Or better, import if circular dependency is not an issue (Service -> Service often ok).
  // But to be safe and quick, I'll define a local interface matching the data we need.

  private getDefaultConfig(): ReceiptConfig {
    return {
      paperWidth: 58,
      storeName: 'PETSHOP',
      storeAddress: 'Jl. Contoh No. 123',
      storePhone: '(021) 123-4567',
      storeEmail: ''
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const printerName = await this.appConfigService.get('receipt.printerName')
      const paperWidth = await this.appConfigService.get('receipt.paperWidth')
      const storeName = await this.appConfigService.get('receipt.storeName')
      const storeAddress = await this.appConfigService.get('receipt.storeAddress')
      const storePhone = await this.appConfigService.get('receipt.storePhone')
      const storeEmail = await this.appConfigService.get('receipt.storeEmail')

      if (printerName) this.config.printerName = printerName
      if (paperWidth) this.config.paperWidth = parseInt(paperWidth, 10)
      if (storeName) this.config.storeName = storeName
      if (storeAddress) this.config.storeAddress = storeAddress
      if (storePhone) this.config.storePhone = storePhone
      if (storeEmail) this.config.storeEmail = storeEmail

      console.log('Printer config loaded:', this.config)
    } catch (error) {
      console.warn('Failed to load printer config:', error)
    }
  }

  async getAvailablePrinters(): Promise<string[]> {
    try {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return []
      const printers = await win.webContents.getPrintersAsync()
      return printers.map((p) => p.name)
    } catch (error) {
      console.error('Failed to get printers:', error)
      return []
    }
  }

  async getPrinterStatus(): Promise<PrinterStatus> {
    const availablePrinters = await this.getAvailablePrinters()
    const configuredPrinter = this.config.printerName

    if (availablePrinters.length === 0) {
      return {
        connected: false,
        printerName: 'Tidak ada printer',
        availablePrinters: []
      }
    }

    const isConnected = configuredPrinter ? availablePrinters.includes(configuredPrinter) : true

    return {
      connected: isConnected,
      printerName: configuredPrinter || availablePrinters[0],
      availablePrinters
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

  private formatWeight(weightInGrams: string | number): string {
    const grams = typeof weightInGrams === 'string' ? parseFloat(weightInGrams) : weightInGrams
    if (grams >= 1000) {
      const kg = grams / 1000
      return `${kg.toFixed(2).replace(/\.?0+$/, '')} Kg`
    }
    return `${Math.round(grams)} gr`
  }

  async printReceipt(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
    try {
      const itemsWithNames = await this.fetchItemsWithProductNames(transaction.items || [])

      const receiptData: ReceiptData = {
        transaction,
        items: itemsWithNames,
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        tax: transaction.tax,
        total: transaction.total
      }

      const html = this.generateReceiptHtml(receiptData)
      return await this.printHtml(html)
    } catch (error) {
      console.error('Receipt printing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown printing error'
      }
    }
  }

  // Core HTML printing method using Electron
  private async printHtml(html: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const tempFile = join(tmpdir(), `receipt_${Date.now()}.html`)

      try {
        writeFileSync(tempFile, html, 'utf8')
        console.log('Temp file created:', tempFile)

        const printWindow = new BrowserWindow({
          show: false,
          width: 400,
          height: 800,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            offscreen: true // Enable offscreen rendering for better print support
          }
        })

        printWindow.loadFile(tempFile)

        printWindow.webContents.on('did-finish-load', async () => {
          const printerName = this.config.printerName
          console.log('Content loaded, printing to:', printerName || 'default printer')

          // Wait for paint to complete
          await new Promise((r) => setTimeout(r, 1000))

          // Force a repaint before printing
          printWindow.webContents.invalidate()
          await new Promise((r) => setTimeout(r, 200))

          // Use printable width for page size
          const printableWidth = this.config.paperWidth <= 58 ? 48 : 72

          printWindow.webContents.print(
            {
              silent: true,
              printBackground: true,
              deviceName: printerName || undefined,
              margins: { marginType: 'none' },
              scaleFactor: 100, // No scaling
              pageSize: {
                width: printableWidth * 1000, // microns (48mm = 48000 microns)
                height: 297000 // Auto height for continuous paper
              }
            },
            (success, failureReason) => {
              printWindow.close()

              try {
                unlinkSync(tempFile)
              } catch {
                // Ignore
              }

              if (success) {
                console.log('Print successful')
                resolve({ success: true })
              } else {
                console.error('Print failed:', failureReason)
                resolve({ success: false, error: failureReason || 'Print failed' })
              }
            }
          )
        })

        printWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
          printWindow.close()
          try {
            unlinkSync(tempFile)
          } catch {
            // Ignore
          }
          resolve({ success: false, error: `Load failed: ${errorDescription} (${errorCode})` })
        })
      } catch (error) {
        try {
          unlinkSync(tempFile)
        } catch {
          // Ignore
        }
        resolve({ success: false, error: error instanceof Error ? error.message : 'Print failed' })
      }
    })
  }

  // Generate receipt HTML with improved clarity for thermal printers
  private generateReceiptHtml(data: ReceiptData): string {
    const { transaction, items, subtotal, discount, tax, total, paidAmount, change } = data
    const w = this.config.paperWidth

    const paymentMethodMap: Record<string, string> = {
      cash: 'Tunai',
      card: 'Kartu',
      qris: 'QRIS',
      credit: 'Kredit'
    }

    const itemsHtml = items
      .map(
        (item) => `
        <div class="item">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-price">${this.formatCurrency(item.price)}</span>
        </div>`
      )
      .join('')

    // Calculate printable width (58mm paper has ~48mm printable area)
    const printableWidth = w <= 58 ? 48 : 72 // 48mm for 58mm paper, 72mm for 80mm paper
    const fontSize = w <= 58 ? 9 : 11 // Smaller font for narrow paper

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${w}mm auto;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${printableWidth}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: ${printableWidth}mm;
      max-width: ${printableWidth}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      font-size: ${fontSize}pt;
      font-weight: 600;
      line-height: 1.2;
      color: #000;
      background: #fff;
      padding: 1mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line {
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    .double-line {
      border-top: 1px solid #000;
      margin: 2mm 0;
    }
    .header { margin-bottom: 2mm; }
    .store-name {
      font-size: ${fontSize + 2}pt;
      font-weight: bold;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
      font-size: ${fontSize - 1}pt;
    }
    .item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 1mm 0;
      font-size: ${fontSize - 1}pt;
    }
    .item-name {
      flex: 1;
      word-break: break-word;
      padding-right: 1mm;
    }
    .item-qty {
      min-width: 8mm;
      text-align: center;
    }
    .item-price {
      min-width: 18mm;
      text-align: right;
    }
    .total-section { margin-top: 2mm; }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
      font-size: ${fontSize}pt;
    }
    .total-row.grand {
      font-size: ${fontSize + 1}pt;
      font-weight: bold;
      margin-top: 1mm;
    }
    .footer {
      margin-top: 3mm;
      text-align: center;
      font-size: ${fontSize - 2}pt;
    }
  </style>
</head>
<body>
  <div class="header center">
    <div class="store-name">${this.config.storeName}</div>
    <div>${this.config.storeAddress}</div>
    <div>${this.config.storePhone}</div>
    ${this.config.storeEmail ? `<div>${this.config.storeEmail}</div>` : ''}
  </div>

  <div class="double-line"></div>

  <div class="info-row"><span>No:</span><span>${transaction.code}</span></div>
  <div class="info-row"><span>Tanggal:</span><span>${new Date(transaction.createdAt).toLocaleString('id-ID')}</span></div>
  <div class="info-row"><span>Kasir:</span><span>${transaction.userId || 'System'}</span></div>
  <div class="info-row"><span>Bayar:</span><span>${paymentMethodMap[transaction.paymentMethod] || transaction.paymentMethod}</span></div>
  ${transaction.paymentMethod === 'credit' && transaction.paymentDeadline ? `<div class="info-row"><span>Jatuh Tempo:</span><span>${new Date(transaction.paymentDeadline).toLocaleDateString('id-ID')}</span></div>` : ''}

  <div class="line"></div>
  <div class="center bold">RINCIAN PEMBELANJAAN</div>
  <div class="line"></div>

  ${itemsHtml}

  <div class="line"></div>

  <div class="total-section">
    <div class="total-row"><span>Subtotal</span><span>${this.formatCurrency(subtotal)}</span></div>
    ${parseFloat(discount) > 0 ? `<div class="total-row"><span>Diskon</span><span>-${this.formatCurrency(discount)}</span></div>` : ''}
    ${parseFloat(tax) > 0 ? `<div class="total-row"><span>Pajak</span><span>${this.formatCurrency(tax)}</span></div>` : ''}
    <div class="total-row grand"><span>TOTAL</span><span>${this.formatCurrency(total)}</span></div>
    ${parseFloat(transaction.totalWeight || '0') > 0 ? `<div class="total-row"><span>Tonase</span><span>${this.formatWeight(transaction.totalWeight)}</span></div>` : ''}
  </div>

  ${
    transaction.paymentMethod === 'cash' && paidAmount
      ? `
    <div class="line"></div>
    <div class="total-row"><span>Tunai</span><span>${this.formatCurrency(paidAmount)}</span></div>
    ${change ? `<div class="total-row"><span>Kembali</span><span>${this.formatCurrency(change)}</span></div>` : ''}
  `
      : ''
  }

  <div class="double-line"></div>

  <div class="footer">
    <div>Terima kasih atas kunjungan Anda</div>
    <div>Barang yang sudah dibeli</div>
    <div>tidak dapat dikembalikan</div>
  </div>
</body>
</html>`
  }

  async printSettlementReport(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const html = this.generateSettlementReportHtml(data)
      return await this.printHtml(html)
    } catch (error) {
      console.error('Settlement report printing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown printing error'
      }
    }
  }

  private generateSettlementReportHtml(data: any): string {
    const {
      shift,
      totalSales,
      totalDiscount,
      totalTax,
      netSales,
      expectedCash,
      totalExpenses,
      // expenseCount,
      paymentMethodStats,
      expenses
    } = data
    const w = this.config.paperWidth
    const printableWidth = w <= 58 ? 48 : 72
    const fontSize = w <= 58 ? 9 : 11

    // Generate Payment Method List
    let paymentMethodsHtml = ''
    if (paymentMethodStats) {
      paymentMethodsHtml = Object.entries(paymentMethodStats)
        .map(
          ([method, amount]) =>
            `<div class="info-row"><span>${method.toUpperCase()}:</span><span>${this.formatCurrency(amount as string)}</span></div>`
        )
        .join('')
    }

    // Generate Expense List
    let expensesHtml = ''
    if (expenses && Array.isArray(expenses) && expenses.length > 0) {
      expensesHtml = expenses
        .map(
          (e: any) =>
            `<div style="margin-bottom: 1mm;">
               <div class="info-row"><span>${e.item}</span><span>${this.formatCurrency(e.total)}</span></div>
               <div style="font-size: 0.8em; color: #555;">${e.description || '-'}</div>
             </div>`
        )
        .join('')
    } else {
      expensesHtml = '<div class="center">- Tidak ada pengeluaran -</div>'
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: ${w}mm auto; margin: 0; }
    @media print {
      html, body { width: ${printableWidth}mm !important; margin: 0 !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${printableWidth}mm;
      max-width: ${printableWidth}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      font-size: ${fontSize}pt;
      font-weight: 500;
      color: #000;
      background: #fff;
      padding: 1mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .line { border-top: 1px dashed #000; margin: 2mm 0; }
    .double-line { border-top: 1px solid #000; margin: 2mm 0; }
    .title { font-size: ${fontSize + 2}pt; font-weight: 600; margin-bottom: 2mm; }
    .store-name { font-size: ${fontSize + 1}pt; font-weight: bold; }
    .info-row { display: flex; justify-content: space-between; margin: 0.5mm 0; }
    .section-title { font-weight: bold; margin-top: 2mm; text-decoration: underline; }
    .footer { margin-top: 3mm; text-align: center; font-size: ${fontSize - 2}pt; }
  </style>
</head>
<body>
  <div class="header center">
    <div class="store-name">${this.config.storeName}</div>
    <div>${this.config.storeAddress}</div>
    <div>${this.config.storePhone}</div>
  </div>

  <div class="double-line"></div>
  <div class="center title">LAPORAN SETTLEMENT</div>
  <div class="double-line"></div>

  <div class="info-row"><span>Kasir:</span><span>${shift.userName || 'Unknown'}</span></div>
  <div class="info-row"><span>Buka:</span><span>${new Date(shift.openedAt).toLocaleString('id-ID')}</span></div>
  <div class="info-row"><span>Tutup:</span><span>${shift.closedAt ? new Date(shift.closedAt).toLocaleString('id-ID') : 'Sekarang'}</span></div>

  <div class="line"></div>
  <div class="section-title">RINGKASAN KAS</div>
  <div class="info-row"><span>Kas Awal:</span><span>${this.formatCurrency(shift.initialCash)}</span></div>
  <div class="info-row"><span>Total Penjualan:</span><span>+${this.formatCurrency(netSales)}</span></div>
  <div class="info-row"><span>Total Pengeluaran:</span><span>-${this.formatCurrency(totalExpenses)}</span></div>
  <div class="line"></div>
  <div class="info-row bold"><span>Ekspektasi Kas:</span><span>${this.formatCurrency(expectedCash)}</span></div>

  <div class="line"></div>
  <div class="section-title">DETAIL PENJUALAN</div>
  <div class="info-row"><span>Total Bruto:</span><span>${this.formatCurrency(totalSales)}</span></div>
  <div class="info-row"><span>Diskon:</span><span>-${this.formatCurrency(totalDiscount)}</span></div>
  <div class="info-row"><span>Pajak:</span><span>+${this.formatCurrency(totalTax)}</span></div>
  <div class="line"></div>
  <div class="info-row bold"><span>PEMBAYARAN</span></div>
  ${paymentMethodsHtml}

  <div class="line"></div>
  <div class="section-title">DETAIL PENGELUARAN</div>
  ${expensesHtml}

  <div class="double-line"></div>
  <div class="footer">
    <div>Dicetak pada: ${new Date().toLocaleString('id-ID')}</div>
  </div>
</body>
</html>`
  }

  async testPrint(): Promise<{ success: boolean; error?: string }> {
    try {
      const status = await this.getPrinterStatus()
      if (!status.connected) {
        return {
          success: false,
          error: `Printer tidak terhubung. Tersedia: ${status.availablePrinters?.join(', ') || 'tidak ada'}`
        }
      }

      const w = this.config.paperWidth
      const printableWidth = w <= 58 ? 48 : 72
      const fontSize = w <= 58 ? 9 : 11

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: ${w}mm auto; margin: 0; }
    @media print {
      html, body { width: ${printableWidth}mm !important; margin: 0 !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${printableWidth}mm;
      max-width: ${printableWidth}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      font-size: ${fontSize}pt;
      font-weight: 600;
      color: #000;
      background: #fff;
      padding: 1mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .line { border-top: 1px solid #000; margin: 2mm 0; }
    .title { font-size: ${fontSize + 3}pt; font-weight: 700; margin: 2mm 0; }
  </style>
</head>
<body>
  <div class="line"></div>
  <div class="center title">TEST PRINT</div>
  <div class="center">Printer Test Page</div>
  <div class="line"></div>
  <div>Printer: ${status.printerName}</div>
  <div>Tanggal: ${new Date().toLocaleString('id-ID')}</div>
  <div>Lebar Kertas: ${w}mm</div>
  <div>Area Cetak: ${printableWidth}mm</div>
  <div class="line"></div>
  <div class="center bold">Test berhasil!</div>
  <div class="line"></div>
</body>
</html>`

      return await this.printHtml(html)
    } catch (error) {
      console.error('Test print failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test print failed'
      }
    }
  }

  async printExpenseReport(data: ExpenseReportData): Promise<{ success: boolean; error?: string }> {
    try {
      const html = this.generateExpenseReportHtml(data)
      return await this.printHtml(html)
    } catch (error) {
      console.error('Expense report printing failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown printing error'
      }
    }
  }

  private generateExpenseReportHtml(data: ExpenseReportData): string {
    const { date, shiftName, expenses, totalExpenses, expenseCount } = data
    const w = this.config.paperWidth

    const expensesHtml = expenses
      .map(
        (expense, i) => `
        <div class="expense-item">
          <div class="expense-name">${i + 1}. ${expense.item}</div>
          <div class="expense-price">${this.formatCurrency(expense.total)}</div>
          ${expense.description ? `<div class="expense-desc">Cat: ${expense.description}</div>` : ''}
        </div>`
      )
      .join('')

    const printableWidth = w <= 58 ? 48 : 72
    const fontSize = w <= 58 ? 7 : 9

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: ${w}mm auto; margin: 0; }
    @media print {
      html, body { width: ${printableWidth}mm !important; margin: 0 !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${printableWidth}mm;
      max-width: ${printableWidth}mm;
      overflow: hidden;
    }
    body {
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      font-size: ${fontSize}pt;
      font-weight: 500;
      color: #000;
      background: #fff;
      padding: 1mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .line { border-top: 1px dashed #000; margin: 2mm 0; }
    .double-line { border-top: 1px solid #000; margin: 2mm 0; }
    .title { font-size: ${fontSize + 2}pt; font-weight: 600; }
    .info-row { display: flex; justify-content: space-between; margin: 0.5mm 0; }
    .expense-item { margin: 1mm 0; }
    .expense-name { font-weight: 600; }
    .expense-price { text-align: right; }
    .expense-desc { font-size: ${fontSize - 2}pt; margin-left: 3mm; }
  </style>
</head>
<body>
  <div class="double-line"></div>
  <div class="center title">LAPORAN PENGELUARAN</div>
  <div class="double-line"></div>

  <div class="info-row"><span>Tanggal:</span><span>${date}</span></div>
  <div class="info-row"><span>Shift:</span><span>${shiftName}</span></div>

  <div class="line"></div>
  <div class="bold">RINGKASAN</div>
  <div class="line"></div>
  <div class="info-row"><span>Jumlah Item:</span><span>${expenseCount}</span></div>
  <div class="info-row bold"><span>Total:</span><span>${this.formatCurrency(totalExpenses)}</span></div>

  <div class="line"></div>
  <div class="bold">RINCIAN</div>
  <div class="line"></div>

  ${expensesHtml}

  <div class="double-line"></div>
  <div class="center">Laporan dicetak otomatis</div>
  <div class="double-line"></div>
</body>
</html>`
  }

  async updateConfig(config: Partial<ReceiptConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    if (config.printerName !== undefined) {
      await this.appConfigService.set('receipt.printerName', config.printerName || '')
    }
    if (config.paperWidth !== undefined) {
      await this.appConfigService.set('receipt.paperWidth', config.paperWidth.toString())
    }
    if (config.storeName !== undefined) {
      await this.appConfigService.set('receipt.storeName', config.storeName || '')
    }
    if (config.storeAddress !== undefined) {
      await this.appConfigService.set('receipt.storeAddress', config.storeAddress || '')
    }
    if (config.storePhone !== undefined) {
      await this.appConfigService.set('receipt.storePhone', config.storePhone || '')
    }
    if (config.storeEmail !== undefined) {
      await this.appConfigService.set('receipt.storeEmail', config.storeEmail || '')
    }

    console.log('Printer config updated:', this.config)
  }

  async getConfig(): Promise<ReceiptConfig> {
    return this.config
  }
}
