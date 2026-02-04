import {
  Add as AddIcon,
  BrokenImage as BrokenImageIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme
} from '@mui/material'
import useAuth from '@renderer/hooks/useAuth'
import useBranchConfig from '@renderer/hooks/useBranchConfig'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { formatCurrency } from '../../../utils/currency'
import Kbd from '../../../components/Kbd'

interface DamagedGood {
  id: string
  productId: string
  storeId: string
  uomId: string
  quantity: number
  cost: string
  totalLoss: string
  reason: string
  notes: string | null
  performedBy: string
  createdAt: Date
  updatedAt: Date
  productName?: string
  productSku?: string
  storeName?: string
  uomCode?: string
}

interface Product {
  id: string
  name: string
  sku: string
  cost: string
}

interface ProductUom {
  id: string
  productId: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
  cost: string | null
}

const DAMAGE_REASONS = [
  'Rusak',
  'Expired',
  'Hilang',
  'Kesalahan Stok',
  'Recall Produk',
  'Lainnya'
]

export default function DamagedGoodsPage(): React.JSX.Element {
  const theme = useTheme()
  const { userId } = useAuth()
  const { storeId } = useBranchConfig()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<DamagedGood[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productUoms, setProductUoms] = useState<ProductUom[]>([])
  const [selectedUom, setSelectedUom] = useState<ProductUom | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState<string>('Rusak')
  const [notes, setNotes] = useState<string>('')
  const [cost, setCost] = useState<string>('0')

  // Load damaged goods
  const loadItems = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await window.api.db.damagedGoods.getAll()
      if (response.success) {
        setItems(response.data || [])
      } else {
        showSnackbar('Gagal memuat data barang rusak', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load products for autocomplete
  const loadProducts = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.db.products.getAll()
      if (response.success) {
        setProducts(response.data || [])
      }
    } catch {
      // Silent fail for products list
    }
  }, [])

  useEffect(() => {
    loadItems()
    loadProducts()
  }, [loadItems, loadProducts])

  // Load product UOMs when product is selected
  useEffect(() => {
    const loadProductUoms = async (): Promise<void> => {
      if (!selectedProduct) {
        setProductUoms([])
        setSelectedUom(null)
        setCost('0')
        return
      }

      try {
        const response = await window.api.db.pricing.getProductUoms(selectedProduct.id)
        if (response.success && response.data) {
          setProductUoms(response.data)
          // Auto-select base unit
          const baseUom = response.data.find((u: ProductUom) => u.isBaseUnit)
          if (baseUom) {
            setSelectedUom(baseUom)
            setCost(baseUom.cost || selectedProduct.cost || '0')
          }
        }
      } catch {
        // Silent fail
      }
    }

    loadProductUoms()
  }, [selectedProduct])

  // Update cost when UOM changes
  useEffect(() => {
    if (selectedUom) {
      setCost(selectedUom.cost || selectedProduct?.cost || '0')
    }
  }, [selectedUom, selectedProduct])

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (event.key === 'Escape' && formOpen) {
          event.preventDefault()
          handleFormClose()
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        handleOpenForm()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (event.key === 'Escape' && formOpen) {
        event.preventDefault()
        handleFormClose()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [formOpen])

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity })
  }, [])

  const handleOpenForm = (): void => {
    setSelectedProduct(null)
    setProductUoms([])
    setSelectedUom(null)
    setQuantity(1)
    setReason('Rusak')
    setNotes('')
    setCost('0')
    setFormOpen(true)
  }

  const handleFormClose = (): void => {
    setFormOpen(false)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!selectedProduct || !selectedUom || !storeId || !userId) {
      showSnackbar('Lengkapi semua field yang diperlukan', 'error')
      return
    }

    try {
      setLoading(true)
      const data = {
        productId: selectedProduct.id,
        storeId: storeId,
        uomId: selectedUom.uomId,
        quantity: quantity,
        cost: cost,
        reason: reason,
        notes: notes || undefined,
        performedBy: userId
      }

      const response = await window.api.db.damagedGoods.create(data)
      if (response.success) {
        showSnackbar('Barang rusak berhasil dicatat', 'success')
        setFormOpen(false)
        await loadItems()
      } else {
        showSnackbar('Gagal mencatat barang rusak', 'error')
      }
    } catch (error) {
      showSnackbar('Terjadi kesalahan saat menyimpan data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan ini?')) return

    try {
      const response = await window.api.db.damagedGoods.delete(id)
      if (response.success) {
        showSnackbar('Catatan berhasil dihapus', 'success')
        await loadItems()
      } else {
        showSnackbar('Gagal menghapus catatan', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat menghapus', 'error')
    }
  }

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items

    return items.filter(
      (item) =>
        item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  // Calculate summary
  const summary = useMemo(() => {
    const totalLoss = items.reduce((sum, item) => sum + parseFloat(item.totalLoss || '0'), 0)
    return {
      totalLoss,
      count: items.length
    }
  }, [items])

  const totalLossForSubmit = parseFloat(cost) * quantity

  return (
    <>
      <Stack spacing={3}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box>
            <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
              Barang Rusak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Catat barang rusak, hilang, atau expired
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={handleOpenForm}
            disabled={loading}
            size="medium"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              boxShadow: theme.shadows[4]
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.875rem' }}>Catat Kerusakan</Typography>
              <Kbd keys={['Ctrl', 'N']} size="small" />
            </Box>
          </Button>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.error.main, 0.04),
                border: `1px solid ${alpha(theme.palette.error.main, 0.12)}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                    <TrendingDownIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Kerugian
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {formatCurrency(summary.totalLoss)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <WarningIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Jumlah Kasus
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {summary.count}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Cari barang rusak
              </Typography>
              <Kbd keys={['Ctrl', 'F']} size="small" />
            </Box>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              placeholder="Cari berdasarkan nama produk, SKU, atau alasan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            {searchTerm && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`${filteredItems.length} hasil ditemukan`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  onDelete={() => setSearchTerm('')}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Alasan</TableCell>
                <TableCell align="right">Kerugian</TableCell>
                <TableCell>Tanggal</TableCell>
                <TableCell align="center">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <BrokenImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'Tidak ada hasil ditemukan' : 'Belum ada catatan barang rusak'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {item.productName || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.productSku}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${item.quantity} ${item.uomCode || ''}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={item.reason} size="small" color="error" variant="filled" />
                      {item.notes && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {item.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="error.main">
                        {formatCurrency(parseFloat(item.totalLoss || '0'))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {/* FAB for mobile */}
      <Fab
        color="error"
        aria-label="add damaged goods"
        onClick={handleOpenForm}
        disabled={loading}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Add Form Dialog */}
      <Dialog open={formOpen} onClose={handleFormClose} maxWidth="sm" fullWidth>
        <DialogTitle>Catat Barang Rusak</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Product Autocomplete */}
            <Autocomplete
              options={products}
              getOptionLabel={(option) => `${option.sku} - ${option.name}`}
              value={selectedProduct}
              onChange={(_, newValue) => setSelectedProduct(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Pilih Produk" required />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.sku}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {/* UOM Select */}
            {productUoms.length > 0 && (
              <TextField
                select
                label="Satuan"
                value={selectedUom?.uomId || ''}
                onChange={(e) => {
                  const uom = productUoms.find((u) => u.uomId === e.target.value)
                  setSelectedUom(uom || null)
                }}
                required
              >
                {productUoms.map((uom) => (
                  <MenuItem key={uom.uomId} value={uom.uomId}>
                    {uom.uomCode} - {uom.uomName}
                    {uom.isBaseUnit && ' (Base)'}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Quantity */}
            <TextField
              label="Jumlah"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              required
            />

            {/* Cost */}
            <TextField
              label="Harga Modal per Unit"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rp</InputAdornment>
              }}
            />

            {/* Reason */}
            <TextField
              select
              label="Alasan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              {DAMAGE_REASONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>

            {/* Notes */}
            <TextField
              label="Catatan"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan (opsional)"
            />

            {/* Total Loss Preview */}
            {selectedProduct && (
              <Alert severity="error" icon={<TrendingDownIcon />}>
                <Typography variant="body2">
                  Total Kerugian: <strong>{formatCurrency(totalLossForSubmit)}</strong>
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleFormClose} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmit}
            disabled={loading || !selectedProduct || !selectedUom}
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
