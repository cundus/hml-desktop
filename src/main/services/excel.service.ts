import * as XLSX from 'xlsx'
import { dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ImportResult<T> {
  success: boolean
  data?: T[]
  errors?: string[]
  totalRows?: number
  successCount?: number
  errorCount?: number
}

export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

export class ExcelService {
  /**
   * Export data to Excel file
   */
  async exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    columns: ExcelColumn[],
    defaultFileName: string
  ): Promise<ExportResult> {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export to Excel',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' }
      }

      // Prepare worksheet data
      const wsData: unknown[][] = []

      // Add header row
      wsData.push(columns.map((col) => col.header))

      // Add data rows
      for (const row of data) {
        const rowData = columns.map((col) => {
          const value = row[col.key]
          // Handle different types
          if (value === null || value === undefined) return ''
          if (value instanceof Date) return value.toISOString()
          if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
          return value
        })
        wsData.push(rowData)
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Set column widths
      ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }))

      XLSX.utils.book_append_sheet(wb, ws, 'Data')

      // Write file
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      writeFileSync(result.filePath, buffer)

      return { success: true, filePath: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * Import data from Excel file
   */
  async importFromExcel<T>(
    columnMapping: Record<string, string>, // Excel header -> field name
    validateRow: (
      row: Record<string, unknown>,
      rowIndex: number
    ) => { valid: boolean; error?: string; data?: T }
  ): Promise<ImportResult<T>> {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import from Excel',
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, errors: ['Import cancelled'] }
      }

      const filePath = result.filePaths[0]
      const fileBuffer = readFileSync(filePath)
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: ''
      })

      if (jsonData.length === 0) {
        return { success: false, errors: ['File is empty or has no data rows'] }
      }

      const importedData: T[] = []
      const errors: string[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const excelRow = jsonData[i]
        const mappedRow: Record<string, unknown> = {}

        // Map Excel columns to field names
        for (const [excelHeader, fieldName] of Object.entries(columnMapping)) {
          // Try exact match first, then case-insensitive
          let value = excelRow[excelHeader]
          if (value === undefined) {
            // Try case-insensitive match
            const key = Object.keys(excelRow).find(
              (k) => k.toLowerCase().trim() === excelHeader.toLowerCase().trim()
            )
            if (key) value = excelRow[key]
          }
          mappedRow[fieldName] = value
        }

        // Validate row
        const validation = validateRow(mappedRow, i + 2) // +2 for 1-indexed and header row
        if (validation.valid && validation.data) {
          importedData.push(validation.data)
        } else {
          errors.push(validation.error || `Row ${i + 2}: Invalid data`)
        }
      }

      return {
        success: errors.length === 0,
        data: importedData,
        errors: errors.length > 0 ? errors : undefined,
        totalRows: jsonData.length,
        successCount: importedData.length,
        errorCount: errors.length
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Import failed']
      }
    }
  }

  /**
   * Generate template Excel file
   */
  async generateTemplate(
    columns: ExcelColumn[],
    sampleData: Record<string, unknown>[],
    defaultFileName: string
  ): Promise<ExportResult> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save Template',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Cancelled' }
      }

      const wsData: unknown[][] = []

      // Header row
      wsData.push(columns.map((col) => col.header))

      // Sample data rows
      for (const row of sampleData) {
        wsData.push(columns.map((col) => row[col.key] ?? ''))
      }

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }))

      XLSX.utils.book_append_sheet(wb, ws, 'Template')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      writeFileSync(result.filePath, buffer)

      return { success: true, filePath: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template'
      }
    }
  }
}
