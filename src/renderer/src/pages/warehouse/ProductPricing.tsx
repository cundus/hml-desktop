import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import CurrencyInput from '../../components/CurrencyInput'

type Product = {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  cost: string
}

type PriceCategory = {
  id: string
  name: string
}

type StoreOption = {
  id: string
  name: string
}

type ProductUomRow = {
  id: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
}

type UomMaster = {
  id: string
  code: string
  name: string
}

function computeMarginFixed(baseCost: number, marginPct: number): number {
  return Math.round(baseCost * (marginPct / 100))
}

function computeMarginPct(baseCost: number, marginFixed: number): number {
  if (baseCost <= 0) return 0
  // Allow decimal percentages for more precise margin when editing by Rp
  const pct = (marginFixed / baseCost) * 100
  return Number(pct.toFixed(2))
}

export default function ProductPricingPage(): React.JSX.Element {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // Base cost (shared across all UOMs)
  const [baseCost, setBaseCost] = useState('0')

  // Margin per UOM: { uomId: { pct: string, fixed: string } }
  const [uomMargins, setUomMargins] = useState<Record<string, { pct: string; fixed: string }>>({})

  // UOM management
  const [productUoms, setProductUoms] = useState<ProductUomRow[]>([])
  const [uomMasters, setUomMasters] = useState<UomMaster[]>([])
  const [selectedUomId, setSelectedUomId] = useState<string | null>(null)
  const [newUomCode, setNewUomCode] = useState('')
  const [newConversionFactor, setNewConversionFactor] = useState('1')

  // Price categories
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([])

  // HQ prices per UOM: { uomId: { categoryId: price } }
  const [allUomPrices, setAllUomPrices] = useState<Record<string, Record<string, string>>>({})

  // Store overrides
  const [stores, setStores] = useState<StoreOption[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [storeCategoryPrices, setStoreCategoryPrices] = useState<Record<string, string>>({})
  const [storeEffectivePrices, setStoreEffectivePrices] = useState<Record<string, number>>({})

  // Load initial data
  useEffect(() => {
    if (!productId) return

    const loadData = async (): Promise<void> => {
      setLoading(true)
      try {
        // Load product
        const productRes = await window.api.db.products.getById(productId)
        if (!productRes.data) {
          navigate('/pricing/products')
          return
        }
        const p = productRes.data
        setProduct({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.categoryId ?? '',
          unit: p.unit ?? 'PCS',
          cost: p.cost ?? '0'
        })
        setBaseCost(p.cost ?? '0')

        // Load UOM masters
        const uomsRes = await window.api.db.uoms.getAll()
        setUomMasters((uomsRes.data ?? []).map((u) => ({ id: u.id, code: u.code, name: u.name })))

        // Load price categories
        const catRes = await window.api.db.pricing.getPriceCategories()
        setPriceCategories(catRes.data ?? [])

        // Load stores
        const storesRes = await window.api.db.stores.getAll()
        setStores(
          (storesRes.data ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name
          }))
        )

        // Load product UOMs
        const productUomsRes = await window.api.db.pricing.getProductUomsByProduct(productId)
        let uomRows = (productUomsRes.data ?? []).map((r) => ({
          id: r.id,
          uomId: r.uomId,
          uomCode: r.uomCode,
          uomName: r.uomName,
          conversionFactor: r.conversionFactor,
          isBaseUnit: r.isBaseUnit
        }))

        // HP-04 FIX: Auto-create base UOM if product has no UOMs configured
        // This ensures save button is always enabled for products
        if (uomRows.length === 0) {
          const uomMasters = (uomsRes.data ?? []).map((u) => ({
            id: u.id,
            code: u.code,
            name: u.name
          }))
          // Find matching UOM from product's unit (e.g., "PCS" -> find PCS in uom masters)
          const productUnit = p.unit ?? 'PCS'
          const matchingUom = uomMasters.find(
            (u) => u.code.toLowerCase() === productUnit.toLowerCase()
          )

          if (matchingUom) {
            try {
              const createRes = await window.api.db.pricing.createProductUom({
                productId,
                uomId: matchingUom.id,
                conversionFactor: 1,
                isBaseUnit: true
              })
              if (createRes.success && createRes.data) {
                uomRows = [
                  {
                    id: createRes.data.id,
                    uomId: matchingUom.id,
                    uomCode: matchingUom.code,
                    uomName: matchingUom.name,
                    conversionFactor: 1,
                    isBaseUnit: true
                  }
                ]
                console.log(
                  `[ProductPricing] Auto-created base UOM ${matchingUom.code} for product ${productId}`
                )
              }
            } catch (err) {
              console.error('Failed to auto-create base UOM:', err)
            }
          }
        }

        setProductUoms(uomRows)

        // Select base UOM by default
        const baseUom = uomRows.find((r) => r.isBaseUnit)
        const defaultUomId = baseUom?.uomId ?? uomRows[0]?.uomId ?? null
        setSelectedUomId(defaultUomId)

        // Load HQ prices for all product UOMs
        const allPrices: Record<string, Record<string, string>> = {}
        const margins: Record<string, { pct: string; fixed: string }> = {}
        const cost = Number(p.cost ?? '0') || 0

        for (const uomRow of uomRows) {
          const pricesRes = await window.api.db.pricing.getCategoryPrices({
            productId,
            uomId: uomRow.uomId
          })
          const prices = pricesRes.data ?? []
          const map: Record<string, string> = {}
          prices.forEach((row) => {
            map[row.priceCategoryId] = row.price
          })
          allPrices[uomRow.uomId] = map

          // Calculate margin from RETAIL price for this UOM
          const retail = prices.find((r) => r.priceCategoryId === 'RETAIL')
          if (retail && cost > 0) {
            const retailPrice = Number(retail.price ?? '0') || 0
            const marginFixed = retailPrice - cost
            const marginPct = computeMarginPct(cost, marginFixed)
            margins[uomRow.uomId] = { pct: String(marginPct), fixed: String(marginFixed) }
          } else {
            margins[uomRow.uomId] = { pct: '0', fixed: '0' }
          }
        }

        setAllUomPrices(allPrices)
        setUomMargins(margins)
      } catch (error) {
        console.error('Failed to load product data', error)
        setSnackbar({ open: true, message: 'Gagal memuat data produk', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [productId, navigate])

  // Load HQ prices for a UOM if not already loaded
  useEffect(() => {
    if (!productId || !selectedUomId) return
    // Already loaded? Skip
    if (allUomPrices[selectedUomId]) return

    const loadUomPrices = async (): Promise<void> => {
      try {
        const pricesRes = await window.api.db.pricing.getCategoryPrices({
          productId,
          uomId: selectedUomId
        })
        const prices = pricesRes.data ?? []
        const map: Record<string, string> = {}
        prices.forEach((row) => {
          map[row.priceCategoryId] = row.price
        })
        setAllUomPrices((prev) => ({ ...prev, [selectedUomId]: map }))

        // Calculate margin from RETAIL
        const retail = prices.find((r) => r.priceCategoryId === 'RETAIL')
        const cost = Number(baseCost) || 0
        if (retail && cost > 0) {
          const retailPrice = Number(retail.price ?? '0') || 0
          const marginFixed = retailPrice - cost
          const marginPct = computeMarginPct(cost, marginFixed)
          setUomMargins((prev) => ({
            ...prev,
            [selectedUomId]: { pct: String(marginPct), fixed: String(marginFixed) }
          }))
        } else {
          setUomMargins((prev) => ({
            ...prev,
            [selectedUomId]: { pct: '0', fixed: '0' }
          }))
        }
      } catch (error) {
        console.error('Failed to load UOM prices', error)
      }
    }

    void loadUomPrices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, selectedUomId, allUomPrices])

  // Load store prices when store or UOM changes
  useEffect(() => {
    if (!productId || !selectedUomId || !selectedStoreId) {
      setStoreCategoryPrices({})
      setStoreEffectivePrices({})
      return
    }

    const loadStorePrices = async (): Promise<void> => {
      try {
        const availRes = await window.api.db.pricing.getAvailableCategoryPrices({
          productId,
          uomId: selectedUomId,
          storeId: selectedStoreId
        })
        const rows = availRes.data ?? []
        const effective: Record<string, number> = {}
        const overrides: Record<string, string> = {}

        rows.forEach((row) => {
          const priceNum = Number(row.price ?? '0') || 0
          effective[row.priceCategoryId] = priceNum
          if (row.source === 'store') {
            overrides[row.priceCategoryId] = row.price
          }
        })

        setStoreEffectivePrices(effective)
        setStoreCategoryPrices(overrides)
      } catch (error) {
        console.error('Failed to load store prices', error)
      }
    }

    void loadStorePrices()
  }, [productId, selectedUomId, selectedStoreId])

  const handleAddUom = async (): Promise<void> => {
    if (!productId || !newUomCode) return
    const uomMaster = uomMasters.find((u) => u.code === newUomCode)
    if (!uomMaster) return
    if (productUoms.some((pu) => pu.uomCode === newUomCode)) return

    const convFactor = Number(newConversionFactor) || 1
    try {
      const res = await window.api.db.pricing.createProductUom({
        productId,
        uomId: uomMaster.id,
        conversionFactor: convFactor,
        isBaseUnit: productUoms.length === 0
      })
      if (res.success && res.data) {
        const newRow: ProductUomRow = {
          id: res.data.id,
          uomId: uomMaster.id,
          uomCode: uomMaster.code,
          uomName: uomMaster.name,
          conversionFactor: convFactor,
          isBaseUnit: productUoms.length === 0
        }
        setProductUoms((prev) => [...prev, newRow])
        setNewUomCode('')
        setNewConversionFactor('1')

        // Auto-select if first UOM
        if (productUoms.length === 0) {
          setSelectedUomId(uomMaster.id)
        }

        setSnackbar({ open: true, message: 'UOM berhasil ditambahkan', severity: 'success' })
      }
    } catch (error) {
      console.error('Failed to add product UOM', error)
      setSnackbar({ open: true, message: 'Gagal menambah UOM', severity: 'error' })
    }
  }

  const handleDeleteUom = async (uomRow: ProductUomRow): Promise<void> => {
    if (uomRow.isBaseUnit) return
    try {
      await window.api.db.pricing.deleteProductUom(uomRow.id)
      setProductUoms((prev) => prev.filter((pu) => pu.id !== uomRow.id))
      if (selectedUomId === uomRow.uomId) {
        const base = productUoms.find((pu) => pu.isBaseUnit)
        setSelectedUomId(base?.uomId ?? null)
      }
      setSnackbar({ open: true, message: 'UOM berhasil dihapus', severity: 'success' })
    } catch (error) {
      console.error('Failed to delete product UOM', error)
      setSnackbar({ open: true, message: 'Gagal menghapus UOM', severity: 'error' })
    }
  }

  const handleSaveAll = async (): Promise<void> => {
    if (!productId) return
    setSaving(true)

    try {
      const tasks: Array<Promise<unknown>> = []
      const cost = Number(baseCost) || 0

      // Save prices for ALL UOMs that have been edited
      for (const uomId of Object.keys(allUomPrices)) {
        const uomPrices = allUomPrices[uomId]
        const margin = uomMargins[uomId]
        const marginFixed = Number(margin?.fixed ?? '0') || 0
        const retailPrice = cost + marginFixed

        // Save RETAIL price (computed from margin)
        tasks.push(
          window.api.db.pricing.upsertCategoryPrice({
            productId,
            uomId,
            priceCategoryId: 'RETAIL',
            price: retailPrice.toString()
          })
        )

        // Save other HQ category prices
        priceCategories.forEach((cat) => {
          if (cat.id === 'RETAIL') return
          const raw = uomPrices[cat.id]
          if (raw == null) return
          const catPrice = Number(raw) || 0
          tasks.push(
            window.api.db.pricing.upsertCategoryPrice({
              productId,
              uomId,
              priceCategoryId: cat.id,
              price: catPrice.toString()
            })
          )
        })
      }

      // Save store overrides if a store is selected (for current UOM only)
      if (selectedStoreId && selectedUomId) {
        priceCategories.forEach((cat) => {
          const rawStore = storeCategoryPrices[cat.id]
          if (rawStore == null) return
          const storePrice = Number(rawStore) || 0
          tasks.push(
            window.api.db.pricing.upsertStorePrice({
              productId,
              uomId: selectedUomId,
              priceCategoryId: cat.id,
              storeId: selectedStoreId,
              price: storePrice.toString()
            })
          )
        })
      }

      await Promise.all(tasks)
      setSnackbar({ open: true, message: 'Harga berhasil disimpan', severity: 'success' })
    } catch (error) {
      console.error('Failed to save pricing', error)
      setSnackbar({ open: true, message: 'Gagal menyimpan harga', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!product) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Produk tidak ditemukan</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/pricing/products')}
          sx={{ mt: 2 }}
        >
          Kembali ke Daftar
        </Button>
      </Box>
    )
  }

  const activeUom = selectedUomId
    ? (productUoms.find((u) => u.uomId === selectedUomId) ?? null)
    : null

  // Get current UOM's margin values
  const currentMargin = selectedUomId ? uomMargins[selectedUomId] : null
  const marginPct = currentMargin?.pct ?? '0'
  const marginFixed = currentMargin?.fixed ?? '0'
  const retailPrice = (Number(baseCost) || 0) + (Number(marginFixed) || 0)

  // Get current UOM's category prices
  const hqCategoryPrices = selectedUomId ? (allUomPrices[selectedUomId] ?? {}) : {}

  // Setters for current UOM's margin
  const setMarginPct = (val: string): void => {
    if (!selectedUomId) return
    setUomMargins((prev) => ({
      ...prev,
      [selectedUomId]: { ...prev[selectedUomId], pct: val }
    }))
  }

  const setMarginFixed = (val: string): void => {
    if (!selectedUomId) return
    setUomMargins((prev) => ({
      ...prev,
      [selectedUomId]: { ...prev[selectedUomId], fixed: val }
    }))
  }

  // Setter for current UOM's category prices
  const setHqCategoryPrices = (
    updater: (prev: Record<string, string>) => Record<string, string>
  ): void => {
    if (!selectedUomId) return
    setAllUomPrices((prev) => ({
      ...prev,
      [selectedUomId]: updater(prev[selectedUomId] ?? {})
    }))
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate('/pricing/products')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{product.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {product.sku} • {product.category || 'No Category'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving || !selectedUomId}
        >
          {saving ? 'Menyimpan...' : 'Simpan Semua'}
        </Button>
      </Stack>

      {/* Section 1: UOM Management */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Satuan Produk (UOM)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Kelola satuan yang tersedia untuk produk ini beserta faktor konversinya.
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {productUoms.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Belum ada UOM. Tambahkan UOM pertama sebagai satuan dasar.
            </Typography>
          ) : (
            productUoms.map((uom) => (
              <Chip
                key={uom.id}
                label={`${uom.uomCode} (×${uom.conversionFactor})${uom.isBaseUnit ? ' - Base' : ''}`}
                color={selectedUomId === uom.uomId ? 'primary' : 'default'}
                onClick={() => setSelectedUomId(uom.uomId)}
                onDelete={uom.isBaseUnit ? undefined : () => handleDeleteUom(uom)}
                deleteIcon={<DeleteIcon fontSize="small" />}
                sx={{ mb: 1 }}
              />
            ))
          )}
        </Stack>

        {activeUom && (
          <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
            Sedang mengatur harga untuk UOM:{' '}
            {`${activeUom.uomCode} (×${activeUom.conversionFactor})${
              activeUom.isBaseUnit ? ' - Base' : ''
            }`}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            select
            size="small"
            label="Tambah UOM"
            value={newUomCode}
            onChange={(e) => setNewUomCode(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">-- Pilih UOM --</MenuItem>
            {uomMasters
              .filter((u) => !productUoms.some((pu) => pu.uomCode === u.code))
              .map((u) => (
                <MenuItem key={u.id} value={u.code}>
                  {u.code} - {u.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            size="small"
            label="Konversi"
            type="number"
            value={newConversionFactor}
            onChange={(e) => setNewConversionFactor(e.target.value)}
            sx={{ width: 100 }}
            inputProps={{ min: 1 }}
            helperText="1 UOM = ? base"
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddUom}
            disabled={!newUomCode}
          >
            Tambah
          </Button>
        </Stack>
      </Paper>

      {/* Section 2: Base Cost & Margin */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Harga Dasar & Margin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Atur biaya dasar dan margin (Rp atau %) untuk menghitung harga RETAIL otomatis.
        </Typography>

        <Stack direction="row" spacing={3} alignItems="flex-start">
          <CurrencyInput
            label="Base Cost"
            value={Number(baseCost) || 0}
            onChange={(value) => {
              const cost = value
              setBaseCost(cost.toString())
              // Recalculate fixed margin from percentage
              const pct = Number(marginPct) || 0
              setMarginFixed(computeMarginFixed(cost, pct).toString())
            }}
            sx={{ width: 200 }}
          />
          <CurrencyInput
            label="Margin (Rp)"
            value={Number(marginFixed) || 0}
            onChange={(value) => {
              setMarginFixed(value.toString())
              // Calculate percentage from fixed
              const cost = Number(baseCost) || 0
              const pct = computeMarginPct(cost, value)
              setMarginPct(pct.toString())
            }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Margin %"
            type="number"
            value={marginPct}
            onChange={(e) => {
              const pct = Number(e.target.value) || 0
              setMarginPct(e.target.value)
              // Calculate fixed from percentage
              const cost = Number(baseCost) || 0
              setMarginFixed(computeMarginFixed(cost, pct).toString())
            }}
            sx={{ width: 100 }}
            inputProps={{ step: 0.01 }}
          />
          <Box sx={{ pt: 1, minWidth: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Harga RETAIL
            </Typography>
            <Typography variant="h6" color="primary">
              {formatCurrency(retailPrice)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Section 3: HQ Category Prices */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Harga per Kategori (HQ)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Atur harga untuk setiap kategori pelanggan.{' '}
          {activeUom ? (
            <Chip
              label={`UOM aktif: ${activeUom.uomCode} (×${activeUom.conversionFactor})${
                activeUom.isBaseUnit ? ' - Base' : ''
              }`}
              color="primary"
              size="small"
              sx={{ ml: 1 }}
            />
          ) : (
            'Pilih UOM terlebih dahulu.'
          )}
        </Typography>

        {!selectedUomId ? (
          <Alert severity="info">Tambahkan dan pilih UOM untuk mengatur harga.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Harga</TableCell>
                <TableCell>Keterangan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {priceCategories.map((cat) => {
                const isRetail = cat.id === 'RETAIL'
                const value = isRetail ? retailPrice : Number(hqCategoryPrices[cat.id] ?? '0') || 0

                return (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={isRetail ? 600 : 400}>
                        {cat.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 200 }}>
                      <CurrencyInput
                        size="small"
                        value={value}
                        onChange={(val) => {
                          if (isRetail) return
                          setHqCategoryPrices((prev) => ({
                            ...prev,
                            [cat.id]: val.toString()
                          }))
                        }}
                        disabled={isRetail}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {isRetail ? 'Otomatis dari Base Cost + Margin' : 'Manual input'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Section 4: Store Overrides */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Harga per Toko (Override)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pilih toko untuk mengatur harga khusus yang berbeda dari HQ.
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            select
            size="small"
            label="Pilih Toko"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            sx={{ minWidth: 250 }}
          >
            <MenuItem value="">-- Tidak ada override --</MenuItem>
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </TextField>
          {activeUom && (
            <Chip
              label={`UOM aktif: ${activeUom.uomCode} (×${activeUom.conversionFactor})${
                activeUom.isBaseUnit ? ' - Base' : ''
              }`}
              color="primary"
              size="small"
            />
          )}
        </Stack>

        {!selectedStoreId ? (
          <Alert severity="info">Pilih toko untuk mengatur harga override.</Alert>
        ) : !selectedUomId ? (
          <Alert severity="info">Tambahkan dan pilih UOM terlebih dahulu.</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Harga HQ</TableCell>
                <TableCell align="right">Override Toko</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {priceCategories.map((cat) => {
                const isRetail = cat.id === 'RETAIL'
                const hqPrice = isRetail
                  ? retailPrice
                  : Number(hqCategoryPrices[cat.id] ?? '0') || 0
                const effective = storeEffectivePrices[cat.id] ?? hqPrice
                const overrideValue =
                  storeCategoryPrices[cat.id] != null
                    ? Number(storeCategoryPrices[cat.id] ?? '0') || 0
                    : effective

                return (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <Typography variant="body2">{cat.name}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(hqPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ width: 200 }}>
                      <CurrencyInput
                        size="small"
                        value={overrideValue}
                        onChange={(val) => {
                          setStoreCategoryPrices((prev) => ({
                            ...prev,
                            [cat.id]: val.toString()
                          }))
                        }}
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
