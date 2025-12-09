import type React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import Kbd from '../../../components/Kbd'
import { formatCurrency } from '../../../utils/currency'

export interface ProductForSelection {
  id: string
  name: string
  sku: string
  category: string
  unit: string // Base unit from product
  cost: string
  price: number // Default price
}

export interface UomOption {
  code: string
  name: string
  conversionFactor: number // e.g., 1 for PCS, 12 for DUS (if 1 DUS = 12 PCS)
  uomId?: string | null // ID from product_uom table, null for legacy fallback
}

export interface PriceCategory {
  id: string
  name: string
  price: number
  margin?: number // percentage
  source?: 'store' | 'default' // where the price comes from
}

export interface ProductSelectResult {
  product: ProductForSelection
  selectedUom: UomOption
  selectedPrice: PriceCategory
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface ProductSelectModalProps {
  open: boolean
  product: ProductForSelection | null
  storeId: string | null
  enableMultiUomPricing?: boolean // Feature flag - defaults to true
  onClose: () => void
  onConfirm: (result: ProductSelectResult) => void
}

export default function ProductSelectModal({
  open,
  product,
  storeId,
  enableMultiUomPricing = true,
  onClose,
  onConfirm
}: ProductSelectModalProps): React.JSX.Element {
  const [uomOptions, setUomOptions] = useState<UomOption[]>([])
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([])
  const [selectedUom, setSelectedUom] = useState<UomOption | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<PriceCategory | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [baseStock, setBaseStock] = useState<number>(0) // Stock in base units
  const quantityInputRef = useRef<HTMLInputElement>(null)

  // Load UOMs and set up price categories when product changes
  useEffect(() => {
    if (!product || !open) return

    const loadData = async (): Promise<void> => {
      try {
        // Load stock for this product at the store
        if (storeId) {
          try {
            const stockRes = await window.api.db.productLocations.getByProductAndStore(
              product.id,
              storeId
            )
            setBaseStock(stockRes.data?.quantity ?? 0)
          } catch {
            setBaseStock(0)
          }
        } else {
          setBaseStock(0)
        }

        // If multi-UOM pricing is disabled, use legacy behavior
        if (!enableMultiUomPricing) {
          const baseUom: UomOption = {
            code: product.unit || 'PCS',
            name: product.unit || 'Pieces',
            conversionFactor: 1,
            uomId: null
          }
          setUomOptions([baseUom])
          setSelectedUom(baseUom)

          const basePrice = product.price
          const categories: PriceCategory[] = [
            { id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 }
          ]
          setPriceCategories(categories)
          setSelectedPrice(categories[0])
          return
        }

        // Load product UOMs from new pricing system
        const productUomsRes = await window.api.db.pricing.getProductUomsByProduct(product.id)
        const productUoms = productUomsRes.data ?? []

        let uomOptionsList: UomOption[] = []

        if (productUoms.length > 0) {
          // Use real product UOMs from the pricing system
          // Sort so base unit comes first
          const sorted = [...productUoms].sort((a, b) => {
            if (a.isBaseUnit) return -1
            if (b.isBaseUnit) return 1
            return a.conversionFactor - b.conversionFactor
          })

          uomOptionsList = sorted.map((pu) => ({
            code: pu.uomCode,
            name: pu.uomName,
            conversionFactor: pu.conversionFactor,
            uomId: pu.uomId
          }))
        } else {
          // Fallback: use product's base unit if no product_uom rows exist
          uomOptionsList = [
            {
              code: product.unit || 'PCS',
              name: product.unit || 'Pieces',
              conversionFactor: 1,
              uomId: null
            }
          ]
        }

        setUomOptions(uomOptionsList)
        const defaultUom = uomOptionsList[0]
        setSelectedUom(defaultUom)

        // Load price categories for the selected UOM
        await loadPriceCategories(product.id, defaultUom, storeId)
      } catch (err) {
        console.error('Failed to load product options:', err)
        // Fallback to legacy behavior
        const baseUom: UomOption = {
          code: product.unit || 'PCS',
          name: product.unit || 'Pieces',
          conversionFactor: 1,
          uomId: null
        }
        setUomOptions([baseUom])
        setSelectedUom(baseUom)

        const basePrice = product.price
        const categories: PriceCategory[] = [
          { id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 }
        ]
        setPriceCategories(categories)
        setSelectedPrice(categories[0])
      }
    }

    void loadData()
    setQuantity(1)
  }, [product, open, storeId])

  // Load price categories when UOM changes
  const loadPriceCategories = async (
    productId: string,
    uom: UomOption,
    currentStoreId: string | null
  ): Promise<void> => {
    try {
      if (!uom.uomId) {
        // No uomId means fallback mode - use product's legacy price
        const basePrice = product?.price ?? 0
        const categories: PriceCategory[] = [
          { id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 }
        ]
        setPriceCategories(categories)
        setSelectedPrice(categories[0])
        return
      }

      // Use getAvailableCategoryPrices to get effective prices (HQ + store overrides)
      const pricesRes = await window.api.db.pricing.getAvailableCategoryPrices({
        productId,
        uomId: uom.uomId,
        storeId: currentStoreId || ''
      })
      const availablePrices = pricesRes.data ?? []

      if (availablePrices.length > 0) {
        const categories: PriceCategory[] = availablePrices.map((ap) => ({
          id: ap.priceCategoryId,
          name: ap.priceCategoryName,
          price: Number(ap.price) || 0,
          source: ap.source
        }))
        setPriceCategories(categories)
        // Default to RETAIL if available, otherwise first
        const retail = categories.find((c) => c.id === 'RETAIL')
        setSelectedPrice(retail || categories[0])
      } else {
        // No prices configured - fallback to product's legacy price
        const basePrice = product?.price ?? 0
        const categories: PriceCategory[] = [
          { id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 }
        ]
        setPriceCategories(categories)
        setSelectedPrice(categories[0])
      }
    } catch (err) {
      console.error('Failed to load price categories:', err)
      // Fallback
      const basePrice = product?.price ?? 0
      setPriceCategories([{ id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 }])
      setSelectedPrice({ id: 'RETAIL', name: 'Retail', price: basePrice, margin: 0 })
    }
  }

  // Reload price categories when UOM selection changes
  useEffect(() => {
    if (!product || !open || !selectedUom) return
    void loadPriceCategories(product.id, selectedUom, storeId)
  }, [selectedUom?.code])

  // Focus quantity input when modal opens
  useEffect(() => {
    if (open && selectedUom && selectedPrice) {
      setTimeout(() => {
        quantityInputRef.current?.focus()
        quantityInputRef.current?.select()
      }, 100)
    }
  }, [open, selectedUom, selectedPrice])

  const handleConfirm = useCallback((): void => {
    if (!product || !selectedUom || !selectedPrice || quantity < 1) return

    const unitPrice = selectedPrice.price * selectedUom.conversionFactor
    const totalPrice = unitPrice * quantity

    onConfirm({
      product,
      selectedUom,
      selectedPrice,
      quantity,
      unitPrice,
      totalPrice
    })
  }, [product, selectedUom, selectedPrice, quantity, onConfirm])

  // Handle keyboard navigation - scoped to dialog only
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (!open) return

      // Enter to confirm
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        handleConfirm()
        return
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Arrow up/down to change quantity
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setQuantity((q) => q + 1)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setQuantity((q) => Math.max(1, q - 1))
        return
      }

      // F1-F12 to select UOM (F1 = first UOM, F2 = second, etc.)
      const fKeyMatch = e.key.match(/^F(\d+)$/)
      if (fKeyMatch) {
        const fIndex = parseInt(fKeyMatch[1], 10) - 1 // F1 = index 0
        if (fIndex >= 0 && fIndex < uomOptions.length) {
          e.preventDefault()
          setSelectedUom(uomOptions[fIndex])
        }
        return
      }

      // Alt + Number keys 1-9, 0 to select price category (Alt+1 = first, Alt+2 = second, ..., Alt+0 = 10th)
      const numMatch = e.key.match(/^[0-9]$/)
      if (numMatch && e.altKey && !e.ctrlKey) {
        const num = parseInt(e.key, 10)
        const priceIndex = num === 0 ? 9 : num - 1 // 1=0, 2=1, ..., 0=9
        if (priceIndex >= 0 && priceIndex < priceCategories.length) {
          e.preventDefault()
          setSelectedPrice(priceCategories[priceIndex])
        }
        return
      }

      // Tab to cycle through price categories
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const currentIndex = priceCategories.findIndex((cat) => cat.id === selectedPrice?.id)
        const nextIndex = (currentIndex + 1) % priceCategories.length
        setSelectedPrice(priceCategories[nextIndex])
        return
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        const currentIndex = priceCategories.findIndex((cat) => cat.id === selectedPrice?.id)
        const prevIndex = currentIndex <= 0 ? priceCategories.length - 1 : currentIndex - 1
        setSelectedPrice(priceCategories[prevIndex])
        return
      }
    },
    [open, onClose, handleConfirm, uomOptions, priceCategories, selectedPrice?.id]
  )

  const handleQuantityChange = (value: string): void => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1) {
      setQuantity(num)
    } else if (value === '') {
      setQuantity(1)
    }
  }

  if (!product) return <></>

  const unitPrice = (selectedPrice?.price ?? 0) * (selectedUom?.conversionFactor ?? 1)
  const totalPrice = unitPrice * quantity

  // INV-002: Calculate stock in selected UOM and check if quantity exceeds
  const stockInSelectedUom = selectedUom ? Math.floor(baseStock / selectedUom.conversionFactor) : 0
  const quantityExceedsStock = baseStock > 0 && quantity > stockInSelectedUom

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>
        <Typography variant="h6" component="span">
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {product.sku} • {product.category}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* UOM Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Satuan
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {uomOptions.map((uom, index) => (
              <Chip
                key={uom.code}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Kbd keys={[`F${index + 1}`]} size="small" />
                    <Typography variant="body2">{uom.code}</Typography>
                  </Box>
                }
                color={selectedUom?.code === uom.code ? 'primary' : 'default'}
                onClick={() => setSelectedUom(uom)}
                sx={{ mb: 1, height: 'auto', py: 1 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price Category Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Kategori Harga
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {priceCategories.map((cat, index) => (
              <Chip
                key={cat.id}
                label={
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        mb: 0.5
                      }}
                    >
                      <Kbd keys={['Alt', `${index + 1}`]} size="small" />
                      <Typography variant="caption">{cat.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(cat.price)}
                    </Typography>
                  </Box>
                }
                color={selectedPrice?.id === cat.id ? 'primary' : 'default'}
                onClick={() => setSelectedPrice(cat)}
                sx={{ height: 'auto', py: 1, mb: 1 }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Quantity Input */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Jumlah
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <RemoveIcon />
            </IconButton>
            <TextField
              inputRef={quantityInputRef}
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 1, style: { textAlign: 'center' } }}
            />
            <IconButton size="small" onClick={() => setQuantity((q) => q + 1)}>
              <AddIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {selectedUom?.code}
            </Typography>
            {/* INV-002: Stock display in selected UOM */}
            {baseStock > 0 && selectedUom && (
              <Typography
                variant="body2"
                color={quantityExceedsStock ? 'warning.main' : 'text.secondary'}
                sx={{ ml: 2 }}
              >
                Stok: {stockInSelectedUom} {selectedUom.code}
                {quantityExceedsStock && ' (melebihi stok!)'}
              </Typography>
            )}
            {baseStock === 0 && (
              <Typography variant="body2" color="error" sx={{ ml: 2 }}>
                Stok habis
              </Typography>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price Summary */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 1
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2">
                {quantity} x {formatCurrency(unitPrice)}
              </Typography>
              <Typography variant="caption">
                {selectedUom?.code} @ {selectedPrice?.name}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(totalPrice)}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['F1']} size="small" />
              <Typography variant="caption">-</Typography>
              <Kbd keys={['F5']} size="small" />
              <Typography variant="caption">Satuan</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['Alt', '1']} size="small" />
              <Typography variant="caption">-</Typography>
              <Kbd keys={['Alt', '3']} size="small" />
              <Typography variant="caption">Harga</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['Tab']} size="small" />
              <Typography variant="caption">Ganti Harga</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['↑']} size="small" />
              <Kbd keys={['↓']} size="small" />
              <Typography variant="caption">Qty</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['Enter']} size="small" />
              <Typography variant="caption">Tambah</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Kbd keys={['Esc']} size="small" />
              <Typography variant="caption">Batal</Typography>
            </Stack>
          </Stack>
        </Typography>
        <Button onClick={onClose}>Batal</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedUom || !selectedPrice || quantity < 1}
        >
          Tambah ke Keranjang
        </Button>
      </DialogActions>
    </Dialog>
  )
}
