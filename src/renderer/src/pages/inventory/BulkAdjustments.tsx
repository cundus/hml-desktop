import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link as RouterLink,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useToast } from '@renderer/contexts/ToastContext'
import useBranchConfig from '@renderer/hooks/useBranchConfig'
import type { Product, Store } from 'src/preload/api'
import useAuth from '@renderer/hooks/useAuth'

interface BulkAdjustmentData {
  row: number
  sku: string
  quantity: number
  note?: string
  productId?: string
  error?: string
  status: 'pending' | 'valid' | 'error'
}

export default function BulkStockAdjustmentsPage(): React.ReactElement {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const { storeId: branchStoreId } = useBranchConfig()
  const { userName } = useAuth()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [adjustments, setAdjustments] = useState<BulkAdjustmentData[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])

  // Download template Excel
  const downloadTemplate = (): void => {
    const template = [
      ['SKU', 'Quantity', 'Catatan'],
      ['PRD001', '10', 'Restock bulanan'],
      ['PRD002', '-5', 'Koreksi stok'],
      ['PRD003', '20', 'Stok baru']
    ]

    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Penyesuaian Stok')

    XLSX.writeFile(wb, 'template_penyesuaian_stok.xlsx')
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)')
      return
    }

    setSelectedFile(file)
    parseExcelFile(file)
  }

  // Parse Excel file
  const parseExcelFile = (file: File): void => {
    setLoading(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        // Skip header row
        const dataRows = jsonData.slice(1)

        const parsed: BulkAdjustmentData[] = dataRows.map((row, index) => ({
          row: index + 2,
          sku: row[0] || '',
          quantity: Number(row[1]) || 0,
          note: row[2] || '',
          status: 'pending' as const
        }))

        setAdjustments(parsed)
        setPreviewOpen(true)
      } catch {
        toast.error('Gagal membaca file Excel. Pastikan format file benar.')
      } finally {
        setLoading(false)
      }
    }

    reader.readAsBinaryString(file)
  }

  // Validate and prepare adjustments
  const validateAdjustments = async (): Promise<BulkAdjustmentData[]> => {
    const validated = [...adjustments]

    // Get all products for validation
    const productsRes = await window.api.db.products.getAll()

    if (!productsRes.success) {
      throw new Error('Gagal memuat data produk')
    }

    const products = productsRes.data || []
    const productMap = new Map(products.map((p) => [p.sku, p]))

    for (let i = 0; i < validated.length; i++) {
      const adj = validated[i]

      // Skip empty rows
      if (!adj.sku && adj.quantity === 0) {
        adj.status = 'valid'
        continue
      }

      // Validate SKU
      const product = productMap.get(adj.sku) as Product
      if (!product) {
        adj.status = 'error'
        adj.error = `SKU ${adj.sku} tidak ditemukan`
        continue
      }

      // Validate quantity
      if (adj.quantity === 0) {
        adj.status = 'error'
        adj.error = 'Quantity tidak boleh 0'
        continue
      }

      // All valid
      adj.status = 'valid'
      adj.productId = product.id
    }

    return validated
  }

  // Submit bulk adjustments
  const handleSubmit = async (): Promise<void> => {
    try {
      setUploading(true)

      // Check if store is selected (for admin users)
      if (!branchStoreId && !selectedStoreId) {
        toast.error('Silakan pilih toko terlebih dahulu')
        return
      }

      const validated = await validateAdjustments()

      const errors = validated.filter((a) => a.status === 'error')
      if (errors.length > 0) {
        toast.error(`${errors.length} baris memiliki error. Perbaiki sebelum submit.`)
        setAdjustments(validated)
        return
      }

      const validAdjustments = validated.filter((a) => a.status === 'valid' && a.productId)

      if (validAdjustments.length === 0) {
        toast.error('Tidak ada data valid untuk diproses')
        return
      }

      // Get current user
      if (!userName) {
        toast.error('Gagal mendapatkan informasi user')
        return
      }

      // Prepare data for API
      const apiData = validAdjustments.map((adj) => ({
        productId: adj.productId!,
        storeId: branchStoreId || selectedStoreId,
        difference: adj.quantity,
        note: adj.note,
        performedBy: userName
      }))

      // Call bulk API
      const result = await window.api.db.inventory.bulkCreateStockAdjustments(apiData)

      if (result.success) {
        toast.success(`Berhasil membuat ${result.data?.length || 0} penyesuaian stok`)
        setPreviewOpen(false)
        setAdjustments([])
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        toast.error(result.error || 'Gagal membuat penyesuaian stok')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setUploading(false)
    }
  }

  // Load stores on component mount
  React.useEffect(() => {
    const loadStores = async (): Promise<void> => {
      if (!branchStoreId) {
        const storesRes = await window.api.db.stores.getAll()
        if (storesRes.success && storesRes.data) {
          setStores(storesRes.data)
          if (!selectedStoreId && storesRes.data.length > 0) {
            setSelectedStoreId(storesRes.data[0].id)
          }
        }
      }
    }
    loadStores()
  }, [branchStoreId, selectedStoreId])

  // Remove adjustment from list
  const removeAdjustment = (index: number): void => {
    setAdjustments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <RouterLink component="button" variant="body1" onClick={() => navigate('/inventory')}>
          Manajemen Inventori
        </RouterLink>
        <Typography color="text.primary">Penyesuaian Stok Massal</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Penyesuaian Stok Massal
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>
            Download Template
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Excel
          </Button>
        </Box>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Store Selector (only for admin) */}
      {!branchStoreId && stores.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Pilih Toko</InputLabel>
              <Select
                value={selectedStoreId}
                label="Pilih Toko"
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                {stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Upload file Excel dengan format: SKU, Quantity, Catatan. Gunakan angka positif untuk
        menambah stok, negatif untuk mengurangi stok.
        {branchStoreId &&
          ` Semua penyesuaian akan dilakukan untuk toko: ${stores.find((s) => s.id === branchStoreId)?.name || 'Current Store'}`}
      </Alert>

      {/* Selected File Info */}
      {selectedFile && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">{selectedFile.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Preview">
                  <IconButton onClick={() => setPreviewOpen(true)}>
                    <PreviewIcon />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => fileInputRef.current?.click()}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200">
          <CircularProgress />
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview Data Penyesuaian Stok</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Baris</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Catatan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adjustments.map((adj, index) => (
                  <TableRow key={index}>
                    <TableCell>{adj.row}</TableCell>
                    <TableCell>{adj.sku}</TableCell>
                    <TableCell>
                      <Chip
                        label={adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                        color={adj.quantity > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{adj.note || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={adj.status}
                        color={
                          adj.status === 'valid'
                            ? 'success'
                            : adj.status === 'error'
                              ? 'error'
                              : 'default'
                        }
                        size="small"
                      />
                      {adj.error && (
                        <Typography variant="caption" color="error" display="block">
                          {adj.error}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeAdjustment(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Tutup</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={uploading || adjustments.length === 0}
            startIcon={uploading ? <CircularProgress size={20} /> : undefined}
          >
            {uploading ? 'Memproses...' : 'Submit Penyesuaian'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
