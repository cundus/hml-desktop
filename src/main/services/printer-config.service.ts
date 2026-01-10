import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'

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

interface PrinterConfigFile {
  printers: PrinterConfig[]
  version: number
}

/**
 * PrinterConfigService - Uses local JSON file for per-PC printer configuration
 * File location: {userData}/printer-config.json
 */
export class PrinterConfigService {
  private configPath: string
  private printers: PrinterConfig[] = []

  constructor() {
    this.configPath = join(app.getPath('userData'), 'printer-config.json')
    this.loadFromFile()
  }

  /**
   * Load printer configs from JSON file
   */
  private loadFromFile(): void {
    try {
      if (existsSync(this.configPath)) {
        const content = readFileSync(this.configPath, 'utf8')
        const data: PrinterConfigFile = JSON.parse(content)
        // Convert date strings back to Date objects
        this.printers = data.printers.map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }))
        console.log(`✓ Loaded ${this.printers.length} printer configs from file`)
      } else {
        this.printers = []
        console.log('No printer config file found, starting fresh')
      }
    } catch (error) {
      console.error('Failed to load printer config file:', error)
      this.printers = []
    }
  }

  /**
   * Save printer configs to JSON file
   */
  private saveToFile(): void {
    try {
      const data: PrinterConfigFile = {
        printers: this.printers,
        version: 1
      }
      writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to save printer config file:', error)
    }
  }

  /**
   * Get all printer configurations
   */
  async getAll(): Promise<PrinterConfig[]> {
    return [...this.printers].sort((a, b) => {
      if (a.purpose !== b.purpose) return a.purpose.localeCompare(b.purpose)
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get printer config by ID
   */
  async findById(id: string): Promise<PrinterConfig | null> {
    return this.printers.find((p) => p.id === id) || null
  }

  /**
   * Get default printer for a specific purpose
   */
  async getDefaultForPurpose(purpose: PrinterPurpose): Promise<PrinterConfig | null> {
    // First try to find default for this purpose
    const defaultPrinter = this.printers.find((p) => p.purpose === purpose && p.isDefault)
    if (defaultPrinter) return defaultPrinter

    // Fallback to any printer for this purpose
    return this.printers.find((p) => p.purpose === purpose) || null
  }

  /**
   * Get all printers for a specific purpose
   */
  async getByPurpose(purpose: PrinterPurpose): Promise<PrinterConfig[]> {
    return this.printers
      .filter((p) => p.purpose === purpose)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  /**
   * Create a new printer configuration
   */
  async create(data: CreatePrinterConfigDto): Promise<PrinterConfig> {
    const now = new Date()

    // If this is set as default, unset other defaults for same purpose
    if (data.isDefault) {
      this.printers.forEach((p) => {
        if (p.purpose === data.purpose) {
          p.isDefault = false
        }
      })
    }

    const newPrinter: PrinterConfig = {
      id: randomUUID(),
      name: data.name,
      printerName: data.printerName,
      printerType: data.printerType,
      paperSize: data.paperSize,
      purpose: data.purpose,
      isDefault: data.isDefault ?? false,
      copies: data.copies ?? 1,
      createdAt: now,
      updatedAt: now
    }

    this.printers.push(newPrinter)
    this.saveToFile()

    return newPrinter
  }

  /**
   * Update an existing printer configuration
   */
  async update(id: string, data: UpdatePrinterConfigDto): Promise<PrinterConfig | null> {
    const index = this.printers.findIndex((p) => p.id === id)
    if (index === -1) return null

    const existing = this.printers[index]

    // If setting as default, unset other defaults for same purpose
    if (data.isDefault) {
      const purpose = data.purpose ?? existing.purpose
      this.printers.forEach((p) => {
        if (p.purpose === purpose && p.id !== id) {
          p.isDefault = false
        }
      })
    }

    // Update fields
    const updated: PrinterConfig = {
      ...existing,
      name: data.name ?? existing.name,
      printerName: data.printerName ?? existing.printerName,
      printerType: data.printerType ?? existing.printerType,
      paperSize: data.paperSize ?? existing.paperSize,
      purpose: data.purpose ?? existing.purpose,
      isDefault: data.isDefault ?? existing.isDefault,
      copies: data.copies ?? existing.copies,
      updatedAt: new Date()
    }

    this.printers[index] = updated
    this.saveToFile()

    return updated
  }

  /**
   * Delete a printer configuration
   */
  async delete(id: string): Promise<boolean> {
    const index = this.printers.findIndex((p) => p.id === id)
    if (index === -1) return false

    this.printers.splice(index, 1)
    this.saveToFile()

    return true
  }

  /**
   * Set a printer as default for its purpose
   */
  async setDefault(id: string): Promise<boolean> {
    const printer = this.printers.find((p) => p.id === id)
    if (!printer) return false

    // Unset other defaults for same purpose
    this.printers.forEach((p) => {
      if (p.purpose === printer.purpose) {
        p.isDefault = p.id === id
      }
    })

    this.saveToFile()
    return true
  }
}
