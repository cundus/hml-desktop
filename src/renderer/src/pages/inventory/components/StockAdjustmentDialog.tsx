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
import { ProductUom } from 'src/preload/api/pricing'
import useAuth from '@renderer/hooks/useAuth'

interface StockAdjustmentDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  initialProductId?: string
  initialStoreId?: string
}

export default function StockAdjustmentDialog({
  open,
  onClose,
  onSuccess,
  initialProductId,
  initialStoreId
}: StockAdjustmentDialogProps): React.JSX.Element {
  const { userName } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [uoms, setUoms] = useState<ProductUom[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productId: initialProductId || '',
    storeId: initialStoreId || '',
    uomId: '', // Selected UOM ID
    difference: '',
    note: ''
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      loadData()
      setFormData((prev) => ({
        ...prev,
        productId: initialProductId || prev.productId,
        storeId: initialStoreId || prev.storeId
      }))
    }
  }, [open, initialProductId, initialStoreId])

  // Load UOMs when product changes
  useEffect(() => {
    if (formData.productId) {
      loadUoms(formData.productId)
    } else {
      setUoms([])
      setFormData((prev) => ({ ...prev, uomId: '' }))
    }
  }, [formData.productId])

  const loadUoms = async (productId: string): Promise<void> => {
    try {
      const res = await window.api.db.pricing.getProductUomsByProduct(productId)
      if (res.success && res.data) {
        setUoms(res.data)
        // Auto-select base unit or first available
        const base = res.data.find((u) => u.isBaseUnit)
        if (base) {
          setFormData((prev) => ({ ...prev, uomId: base.uomId }))
        } else if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, uomId: res.data[0].uomId }))
        }
      }
    } catch (err) {
      console.error('Failed to load UOMs', err)
    }
  }

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

    if (!formData.uomId) {
      errors.uomId = 'Unit is required'
    }

    if (!formData.difference) {
      errors.difference = 'Adjustment amount is required'
    } else {
      const diff = parseFloat(formData.difference) // Allow decimals for input
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
      if (!userName) {
        setError('User not authenticated')
        return
      }

      // Calculate total difference in base unit
      const selectedUom = uoms.find((u) => u.uomId === formData.uomId)
      if (!selectedUom) {
        setError('Invalid unit selected')
        return
      }

      const inputDiff = parseFloat(formData.difference)
      const totalDifference = inputDiff * selectedUom.conversionFactor

      const result = await window.api.db.inventory.createStockAdjustment({
        productId: formData.productId,
        storeId: formData.storeId,
        difference: totalDifference,
        note: formData.note ? `${formData.note} (${inputDiff} ${selectedUom.uomCode})` : `Adjusted ${inputDiff} ${selectedUom.uomCode}`,
        performedBy: userName
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
      productId: initialProductId || '',
      storeId: initialStoreId || '',
      uomId: '',
      difference: '',
      note: ''
    })
    setFieldErrors({})
    setError(null)
    onClose()
  }

  const selectedProduct = products.find((p) => p.id === formData.productId)
  const selectedUom = uoms.find((u) => u.uomId === formData.uomId)

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

          {formData.productId && (
             <FormControl fullWidth margin="normal" error={!!fieldErrors.uomId}>
             <InputLabel>Satuan (UOM)</InputLabel>
             <Select
               value={formData.uomId}
               label="Satuan (UOM)"
               onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
             >
               {uoms.map((uom) => (
                 <MenuItem key={uom.uomId} value={uom.uomId}>
                   {uom.uomCode} {uom.isBaseUnit ? '(Base)' : `(x${uom.conversionFactor})`}
                 </MenuItem>
               ))}
             </Select>
             {fieldErrors.uomId && (
               <Typography variant="caption" color="error">
                 {fieldErrors.uomId}
               </Typography>
             )}
           </FormControl>
          )}

          <TextField
            fullWidth
            margin="normal"
            label="Jumlah Penyesuaian"
            type="number"
            value={formData.difference}
            onChange={(e) => setFormData({ ...formData, difference: e.target.value })}
            error={!!fieldErrors.difference}
            helperText={
              fieldErrors.difference ||
              'Gunakan angka positif untuk menambah stok, negatif untuk mengurangi stok'
            }
          />
          
          {selectedUom && selectedUom.conversionFactor > 1 && formData.difference && (
             <Typography variant="body2" color="primary" sx={{ mt: 1, mb: 1, fontWeight: 'medium' }}>
               Total perubahan stok base unit: {parseFloat(formData.difference) * selectedUom.conversionFactor} {selectedProduct?.unit}
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
