import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import useAuth from '@renderer/hooks/useAuth'
import useBranchConfig from '@renderer/hooks/useBranchConfig'

interface ImportRow {
  sku: string
  name: string
  category?: string
  unit?: string
  cost?: number
  price1?: number
  price2?: number
  price3?: number
  stock?: number
  isValid: boolean
  errors: string[]
  [key: string]: any
}

interface Store {
  id: string
  name: string
}

interface ProductImportDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ProductImportDialog({
  open,
  onClose,
  onSuccess
}: ProductImportDialogProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const { storeId: branchStoreId } = useBranchConfig()
  const { userId, userName } = useAuth()

  // Load stores
  React.useEffect(() => {
    const loadStores = async (): Promise<void> => {
      const res = await window.api.db.stores.getAll()
      if (res.success && res.data) {
        setStores(res.data)
        // Auto-select if branch mode or only 1 store
        if (branchStoreId) setStoreId(branchStoreId)
        else if (res.data.length === 1) setStoreId(res.data[0].id)
      }
    }
    void loadStores()
  }, [branchStoreId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseFile(selectedFile)
    }
  }

  const parseFile = async (file: File): Promise<void> => {
    setLoading(true)
    setError(null)
    setPreviewData([])

    const reader = new FileReader()
    reader.onload = (e): void => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[]

        if (jsonData.length === 0) {
          setError('File kosong atau format tidak valid')
          setLoading(false)
          return
        }

        const parsedRows: ImportRow[] = jsonData.map((row: any) => {
          const errors: string[] = []

          // Normalize row keys
          const normRow = new Map<string, any>()
          Object.keys(row).forEach((k) => normRow.set(k.trim().toLowerCase(), row[k]))

          const sku = normRow.get('sku')
          const name = normRow.get('nama') || normRow.get('name')

          if (!sku) errors.push('SKU wajib diisi')
          if (!name) errors.push('Nama wajib diisi')

          // Fixed 3 prices parsing
          let p1 = 0,
            p2 = 0,
            p3 = 0

          normRow.forEach((val, key) => {
            if (key.startsWith('harga 1') || key.startsWith('harga: umum')) p1 = Number(val) || 0
            if (key.startsWith('harga 2') || key.startsWith('harga: grosir')) p2 = Number(val) || 0
            if (key.startsWith('harga 3') || key.startsWith('harga: partai')) p3 = Number(val) || 0
          })

          const category = normRow.get('kategori') || normRow.get('category')
          const unit = normRow.get('satuan') || normRow.get('unit')
          const cost = Number(normRow.get('modal') || normRow.get('cost') || 0)
          const stock = Number(
            normRow.get('stok') || normRow.get('stok awal') || normRow.get('stock') || 0
          )

          return {
            ...row,
            sku,
            name,
            category,
            unit,
            cost,
            stock,
            price1: p1,
            price2: p2,
            price3: p3,
            isValid: errors.length === 0,
            errors
          }
        })

        setPreviewData(parsedRows)
      } catch (err) {
        setError('Gagal membaca file Excel. Pastikan format benar.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = (): void => {
      setError('Error reading file')
      setLoading(false)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async (): Promise<void> => {
    const validRows = previewData.filter((r) => r.isValid)
    if (validRows.length === 0) return

    setImporting(true)
    try {
      // Map data to backend expected format
      // Note: Backend 'importBatch' needs to be robust to handle these fields
      // Map data with fixed prices
      const importData = validRows.map((r) => ({
        sku: r.sku,
        name: r.name,
        category: r.category,
        unit: r.unit || 'Pcs',
        cost: r.cost,
        stock: r.stock,
        prices: [r.price1, r.price2, r.price3] // Send array
      }))

      if (!storeId) {
        setError('Silakan pilih toko untuk stok awal')
        setImporting(false)
        return
      }

      const res = await window.api.db.products.importBatch(
        importData,
        storeId,
        userId || userName || 'import-tool'
      )

      if (res.success) {
        const { successCount, failureCount, skipCount, errors } = res.data || {}

        // Show message if there are failures OR skips (unexpected for user who thinks they deleted)
        // Or just always show summary if not pure success?
        // Let's mimic stricter feedback:
        // If anything is NOT a clean success (failure > 0 or skip > 0), show message.
        // OR if successCount == 0 (nothing happened).

        if (failureCount > 0 || skipCount > 0 || successCount === 0) {
          let msg = `Import Selesai:\n`
          if (successCount > 0) msg += `- ${successCount} Berhasil\n`
          if (skipCount > 0) msg += `- ${skipCount} Dilewati (SKU sudah ada)\n`
          if (failureCount > 0) msg += `- ${failureCount} Gagal\n`

          if (errors && errors.length > 0) {
            msg += `\nDetail Error:\n${errors.join('\n')}`
          }

          setError(msg)
          // If we have some success, we might want to reload background
          if (successCount > 0) onSuccess()
        } else {
          // Pure success
          onSuccess()
          onClose()
        }
      } else {
        setError(res.error || 'Import gagal') // Show specific errors?
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat import')
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = async (): Promise<void> => {
    // Generate template logic
    // We can do this in Frontend for dynamic columns
    try {
      // Fetch categories for label hints
      const catsRes = await window.api.db.pricing.getPriceCategories()
      const cats = catsRes.success && catsRes.data ? catsRes.data : []
      // Sort: logic? assume result is sorted or sort by sortOrder
      // Fixed 3 columns
      const h1 = cats[0] ? `Harga 1 (${cats[0].name})` : 'Harga 1'
      const h2 = cats[1] ? `Harga 2 (${cats[1].name})` : 'Harga 2'
      const h3 = cats[2] ? `Harga 3 (${cats[2].name})` : 'Harga 3'

      const wsData = [
        ['SKU', 'Nama', 'Kategori', 'Satuan', 'Modal', h1, h2, h3, 'Stok'],
        ['BRG001', 'Contoh Produk', 'Makanan', 'Pcs', 10000, 15000, 14000, 13000, 10]
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Template')
      XLSX.writeFile(wb, 'Template_Import_Produk.xlsx')
    } catch (err) {
      console.error('Failed to generate template', err)
      setError('Gagal membuat template')
    }
  }

  return (
    <Dialog open={open} onClose={() => !importing && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle>Import Produk Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Store Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Toko (Stok Awal)</InputLabel>
            <Select
              value={storeId}
              label="Toko (Stok Awal)"
              onChange={(e) => setStoreId(e.target.value)}
              disabled={!!branchStoreId} // Lock if branch
            >
              {stores.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box display="flex" gap={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
            <Box flex={1} />
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              Pilih File Excel
            </Button>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {file && (
            <Typography variant="body2">
              File: <b>{file.name}</b>
            </Typography>
          )}

          {loading && <CircularProgress />}

          {previewData.length > 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Nama</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>Satuan</TableCell>
                    <TableCell align="right">Modal</TableCell>
                    <TableCell align="right">Harga 1</TableCell>
                    <TableCell align="right">Harga 2</TableCell>
                    <TableCell align="right">Harga 3</TableCell>
                    <TableCell align="right">Stok</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {row.isValid ? (
                          <Chip label="Valid" color="success" size="small" />
                        ) : (
                          <Chip label="Invalid" color="error" size="small" />
                        )}
                        {row.errors.length > 0 && (
                          <Typography variant="caption" color="error" display="block">
                            {row.errors.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell align="right">{row.cost}</TableCell>
                      <TableCell align="right">{row.price1}</TableCell>
                      <TableCell align="right">{row.price2}</TableCell>
                      <TableCell align="right">{row.price3}</TableCell>
                      <TableCell align="right">{row.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Batal
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={loading || importing || previewData.filter((r) => r.isValid).length === 0}
          startIcon={importing ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {importing
            ? 'Memproses...'
            : `Import ${previewData.filter((r) => r.isValid).length} Produk`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
