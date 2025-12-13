import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import { Close as CloseIcon } from '@mui/icons-material'
import { Product, Store } from 'src/preload/api'

interface StockAdjustmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function StockAdjustmentDialog({
  open,
  onClose,
  onSuccess
}: StockAdjustmentDialogProps): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productId: '',
    storeId: '',
    difference: '',
    note: ''
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const [productsResult, storesResult] = await Promise.all([
        window.api.db.products.getAll(),
        window.api.db.stores.getAll()
      ])

      if (productsResult.success) {
        setProducts(productsResult.data.filter((p) => p.isActive))
      }

      if (storesResult.success) {
        setStores(storesResult.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.productId) {
      errors.productId = 'Product is required'
    }

    if (!formData.storeId) {
      errors.storeId = 'Store is required'
    }

    if (!formData.difference) {
      errors.difference = 'Adjustment amount is required'
    } else {
      const diff = parseInt(formData.difference)
      if (isNaN(diff) || diff === 0) {
        errors.difference = 'Please enter a valid non-zero number'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const user = await window.api.db.auth.getCurrentUser()
      if (!user.success || !user.data) {
        setError('User not authenticated')
        return
      }

      const result = await window.api.db.inventory.createStockAdjustment({
        productId: formData.productId,
        storeId: formData.storeId,
        difference: parseInt(formData.difference),
        note: formData.note || undefined,
        performedBy: user.data.name || user.data.id
      })

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.error || 'Failed to create adjustment')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = (): void => {
    setFormData({
      productId: '',
      storeId: '',
      difference: '',
      note: ''
    })
    setFieldErrors({})
    setError(null)
    onClose()
  }

  const selectedProduct = products.find((p) => p.id === formData.productId)

  if (loading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Penyesuaian Stok</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth margin="normal" error={!!fieldErrors.productId}>
            <InputLabel>Produk</InputLabel>
            <Select
              value={formData.productId}
              label="Product"
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.productId && (
              <Typography variant="caption" color="error">
                {fieldErrors.productId}
              </Typography>
            )}
          </FormControl>

          <FormControl fullWidth margin="normal" error={!!fieldErrors.storeId}>
            <InputLabel>Toko</InputLabel>
            <Select
              value={formData.storeId}
              label="Store"
              onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
            >
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.storeId && (
              <Typography variant="caption" color="error">
                {fieldErrors.storeId}
              </Typography>
            )}
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Jumlah Penyesuaian"
            type="number"
            value={formData.difference}
            onChange={(e) => setFormData({ ...formData, difference: e.target.value })}
            error={!!fieldErrors.difference}
            helperText={fieldErrors.difference || 'Gunakan angka positif untuk menambah stok, negatif untuk mengurangi stok'}
          />

          {selectedProduct && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Satuan: {selectedProduct.unit}
            </Typography>
          )}

          <TextField
            fullWidth
            margin="normal"
            label="Catatan (opsional)"
            multiline
            rows={3}
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Alasan penyesuaian..."
          />
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Membuat...' : 'Buat Penyesuaian'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
