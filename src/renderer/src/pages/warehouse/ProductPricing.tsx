import React, { useEffect, useState } from 'react'
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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import LockIcon from '@mui/icons-material/Lock'
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

type ProductUomRow = {
  id: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
  cost: string | null
  costOverride: boolean
}

function computeMarginFixed(baseCost: number, marginPct: number): number {
  return Math.round(baseCost * (marginPct / 100))
}

function computeMarginPct(baseCost: number, marginFixed: number): number {
  if (baseCost <= 0) return 0
  const pct = (marginFixed / baseCost) * 100
  return Number(pct.toFixed(2))
}

export default function ProductPricingPage(): React.JSX.Element {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)

  // State for Purchase Unit (to calculate base cost)
  const [purchaseUomId, setPurchaseUomId] = useState<string | null>(null)
  const [purchaseCost, setPurchaseCost] = useState('0')
  const [baseCost, setBaseCost] = useState('0') // Calculated base cost

  const [productUoms, setProductUoms] = useState<ProductUomRow[]>([])
  const [uomMasters, setUomMasters] = useState<{ id: string; code: string; name: string }[]>([])

  // Add UOM State
  const [newUomId, setNewUomId] = useState('')
  const [newConversionFactor, setNewConversionFactor] = useState('1')

  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([])

  // Matrix State: { uomId: { categoryId: price } }
  const [allUomPrices, setAllUomPrices] = useState<Record<string, Record<string, string>>>({})

  // Margin State: { uomId: { pct: string, fixed: string } }
  const [uomMargins, setUomMargins] = useState<Record<string, { pct: string; fixed: string }>>({})

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // Initialize Data
  useEffect(() => {
    if (!productId) return

    const loadData = async (): Promise<void> => {
      setLoading(true)
      try {
        // Load Product
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

        // Load UOM Masters (for add UOM dropdown)
        const uomsRes = await window.api.db.uoms.getAll()
        const uomMastersList = (uomsRes.data ?? []).map((u) => ({
          id: u.id,
          code: u.code,
          name: u.name
        }))
        setUomMasters(uomMastersList)

        // Load Categories
        const catRes = await window.api.db.pricing.getPriceCategories()
        const categories = catRes.data ?? []
        setPriceCategories(categories)

        // Load Product UOMs
        const productUomsRes = await window.api.db.pricing.getProductUomsByProduct(productId)
        // Deduplicate
        const seenUoms = new Set<string>()
        let uomRows = (productUomsRes.data ?? [])
          .map((r) => ({
            id: r.id,
            uomId: r.uomId,
            uomCode: r.uomCode,
            uomName: r.uomName,
            conversionFactor: r.conversionFactor,
            isBaseUnit: r.isBaseUnit,
            cost: r.cost,
            costOverride: r.costOverride
          }))
          .filter((uom) => {
            if (seenUoms.has(uom.uomId)) return false
            seenUoms.add(uom.uomId)
            return true
          })

        // Auto-create base UOM if empty
        if (uomRows.length === 0) {
          const productUnit = p.unit ?? 'PCS'
          const matchingUom = uomMastersList.find(
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
                    isBaseUnit: true,
                    cost: null,
                    costOverride: false
                  }
                ]
              }
            } catch (e) {
              console.error('Auto-create failed', e)
            }
          }
        }
        setProductUoms(uomRows)

        // Initialize Pricing Matrix State
        const allPrices: Record<string, Record<string, string>> = {}
        const margins: Record<string, { pct: string; fixed: string }> = {}

        // We need base cost to calculate initial margins properly
        const currentBaseCost = Number(p.cost) || 0

        for (const uomRow of uomRows) {
          // Fetch existing prices
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

          // Calculate Initial Effective Cost for this UOM
          let effectiveCost = currentBaseCost
          if (uomRow.costOverride && uomRow.cost) {
            effectiveCost = Number(uomRow.cost)
          } else {
            // Find base UOM conversion
            const baseUom = uomRows.find((u) => u.isBaseUnit)
            const baseConv = baseUom?.conversionFactor || 1
            effectiveCost = (currentBaseCost / baseConv) * uomRow.conversionFactor
          }

          // Calculate Margin
          const retailPriceStr = map['RETAIL']
          if (retailPriceStr && effectiveCost > 0) {
            const retail = Number(retailPriceStr)
            const marginFixed = retail - effectiveCost
            const marginPct = computeMarginPct(effectiveCost, marginFixed)
            margins[uomRow.uomId] = { pct: marginPct.toString(), fixed: marginFixed.toString() }
          } else {
            margins[uomRow.uomId] = { pct: '0', fixed: '0' }
          }
        }

        setAllUomPrices(allPrices)
        setUomMargins(margins)

        // Initialize Purchase Unit Selection (Default to Base)
        const baseUom = uomRows.find((r) => r.isBaseUnit)
        if (baseUom) {
          setPurchaseUomId(baseUom.uomId)
          // For base unit, purchase cost = base cost
          setPurchaseCost(p.cost || '0')
        } else if (uomRows.length > 0) {
          setPurchaseUomId(uomRows[0].uomId)
          // Estimate cost based on conversion
          const uom = uomRows[0]
          setPurchaseCost(((Number(p.cost) || 0) * uom.conversionFactor).toString())
        }
      } catch (error) {
        console.error('Failed to load pricing data', error)
        setSnackbar({ open: true, message: 'Gagal memuat data harga', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [productId, navigate])

  // Helper: Get Effective Cost for a UOM (Live Calculation)
  const getEffectiveCost = (uom: ProductUomRow): number => {
    // 1. Used manual override if set
    if (uom.costOverride && uom.cost) {
      return Number(uom.cost)
    }

    // 2. Calculate from Base Cost
    const baseUnitCost = Number(baseCost) || 0
    const baseUom = productUoms.find((u) => u.isBaseUnit)
    const baseConversion = baseUom?.conversionFactor || 1

    // Formula: (BaseCost / BaseConv) * TargetConv
    return (baseUnitCost / baseConversion) * uom.conversionFactor
  }

  // Handlers

  const handlePurchaseCostChange = (newCost: number) => {
    setPurchaseCost(newCost.toString())

    // Recalculate Base Cost
    if (purchaseUomId) {
      const uom = productUoms.find((u) => u.uomId === purchaseUomId)
      if (uom) {
        // Base Cost is cost of 1 Base Unit
        // If Purchase Unit is SAK (25 PCS), and Cost is 25000
        // Then Base Cost (PCS) = 25000 / 25 = 1000

        // We need to normalize to Base Unit.
        // BaseCost = (NewCost / UomConversion) * BaseUomConversion
        const baseUom = productUoms.find((u) => u.isBaseUnit)
        const baseConv = baseUom?.conversionFactor || 1

        const newBaseCost = (newCost / uom.conversionFactor) * baseConv
        setBaseCost(newBaseCost.toString())

        // Triggers Re-render of Matrix because getEffectiveCost depends on baseCost
      }
    }
  }

  const handleAddUom = async (): Promise<void> => {
    if (!productId || !newUomId) return
    const uomMaster = uomMasters.find((u) => u.id === newUomId)
    if (!uomMaster) return
    if (productUoms.some((pu) => pu.uomId === newUomId)) {
      setSnackbar({ open: true, message: 'UOM sudah ada', severity: 'error' })
      return
    }

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
          isBaseUnit: productUoms.length === 0,
          cost: null,
          costOverride: false
        }
        setProductUoms((prev) => [...prev, newRow])
        setNewUomId('')
        setNewConversionFactor('1')
        setSnackbar({ open: true, message: 'UOM berhasil ditambahkan', severity: 'success' })
      }
    } catch (error) {
      console.error('Failed to add product UOM', error)
      setSnackbar({ open: true, message: 'Gagal menambah UOM', severity: 'error' })
    }
  }

  const handleManualCostToggle = (uomId: string, currentOverride: boolean) => {
    setProductUoms((prev) =>
      prev.map((u) => {
        if (u.uomId === uomId) {
          // When enabling override, set current calculated cost as the manual cost
          const calculated = getEffectiveCost(u)
          return { ...u, costOverride: !currentOverride, cost: calculated.toString() }
        }
        return u
      })
    )
  }

  const handleManualCostChange = (uomId: string, val: string) => {
    setProductUoms((prev) =>
      prev.map((u) => {
        if (u.uomId === uomId) return { ...u, cost: val }
        return u
      })
    )
  }

  const handleMarginChange = (uomId: string, newPct: string) => {
    setUomMargins((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], pct: newPct }
    }))

    // Update Retail Price based on new Margin %
    const uom = productUoms.find((u) => u.uomId === uomId)
    if (uom) {
      const cost = getEffectiveCost(uom)
      const marginFixed = computeMarginFixed(cost, Number(newPct))
      const retailPrice = cost + marginFixed

      setAllUomPrices((prev) => ({
        ...prev,
        [uomId]: { ...prev[uomId], ['RETAIL']: retailPrice.toString() }
      }))

      setUomMargins((prev) => ({
        ...prev,
        [uomId]: { pct: newPct, fixed: marginFixed.toString() }
      }))
    }
  }

  const handleRetailPriceChange = (uomId: string, newPrice: string) => {
    // Update Price
    setAllUomPrices((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], ['RETAIL']: newPrice }
    }))

    // Update Margin %
    const uom = productUoms.find((u) => u.uomId === uomId)
    if (uom) {
      const cost = getEffectiveCost(uom)
      const retail = Number(newPrice) || 0
      const marginFixed = retail - cost
      const marginPct = computeMarginPct(cost, marginFixed)

      setUomMargins((prev) => ({
        ...prev,
        [uomId]: { pct: marginPct.toString(), fixed: marginFixed.toString() }
      }))
    }
  }

  const handleOtherPriceChange = (uomId: string, categoryId: string, newPrice: string) => {
    setAllUomPrices((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], [categoryId]: newPrice }
    }))
  }

  const handleSaveAll = async () => {
    if (!productId) return
    setSaving(true)
    try {
      const tasks: Array<Promise<unknown>> = []

      // 1. Update Product Base Cost
      tasks.push(
        window.api.db.pricing.updateProductUomCost({
          productId,
          uomId: '', // Update base product cost? No, API might differ.
          // Actually we should simple update the product master cost
          // But existing APIs are specific. Let's use the updateProductUomCost for all UOMs to be sure.
          cost: Number(baseCost),
          costOverride: false, // This param is ignored for product master update usually, wait.
          recalculateOthers: false
        })
      )

      // We need to update existing product.cost
      // Let's use custom SQL or just loop UOMs.

      // 2. Loop UOMs and Save
      for (const uom of productUoms) {
        const cost = getEffectiveCost(uom)

        // Save Cost Config (Override status and value)
        // We need an API that updates cost/override without recalculating everything purely
        tasks.push(
          window.api.db.pricing.updateProductUomCost({
            productId,
            uomId: uom.uomId,
            cost: cost,
            costOverride: uom.costOverride,
            recalculateOthers: false
          })
        )

        // Save Prices
        const prices = allUomPrices[uom.uomId] || {}
        for (const cat of priceCategories) {
          const price = prices[cat.id] || '0'
          tasks.push(
            window.api.db.pricing.upsertCategoryPrice({
              productId,
              uomId: uom.uomId,
              priceCategoryId: cat.id,
              price: price
            })
          )
        }
      }

      await Promise.all(tasks)
      setSnackbar({ open: true, message: 'Harga berhasil disimpan', severity: 'success' })
    } catch (e) {
      console.error(e)
      setSnackbar({ open: true, message: 'Gagal menyimpan', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    )
  if (!product) return <Alert severity="error">Produk tidak ditemukan</Alert>

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header & Actions */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
        <IconButton onClick={() => navigate('/pricing/products')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{product.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {product.sku} • {product.category}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </Stack>

      {/* Control Panel: Base Cost */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Typography variant="subtitle2" sx={{ width: 100 }}>
            Harga Dasar:
          </Typography>

          <TextField
            select
            label="Satuan Pembelian"
            size="small"
            value={purchaseUomId || ''}
            onChange={(e) => {
              setPurchaseUomId(e.target.value)
              const uom = productUoms.find((u) => u.uomId === e.target.value)
              if (uom) {
                // When switching Purchase Unit, calculate the Purchase Cost from Base Cost
                // BaseCost = (PurchaseCost/Conv) * BaseConv
                // -> PurchaseCost = (BaseCost / BaseConv) * Conv
                const baseUom = productUoms.find((u) => u.isBaseUnit)
                const baseConv = baseUom?.conversionFactor || 1
                const newPurchaseCost = (Number(baseCost) / baseConv) * uom.conversionFactor
                setPurchaseCost(newPurchaseCost.toString())
              }
            }}
            sx={{ width: 150 }}
          >
            {productUoms.map((u) => (
              <MenuItem key={u.id} value={u.uomId}>
                {u.uomCode} ({u.conversionFactor}x)
              </MenuItem>
            ))}
          </TextField>

          <CurrencyInput
            label="Harga Beli (Modal)"
            value={Number(purchaseCost)}
            onChange={handlePurchaseCostChange}
            sx={{ width: 200 }}
          />

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Chip
              label={`Harga Modal: Rp ${Number(baseCost).toLocaleString('id-ID')} / Satuan Dasar`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Stack>
      </Paper>

      {/* Pricing Matrix */}
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Satuan (UOM)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Konversi</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 200 }}>Harga Modal (Cost)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Margin (%)</TableCell>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  width: 180,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText'
                }}
              >
                Harga Retail
              </TableCell>
              {priceCategories
                .filter((c) => c.id !== 'RETAIL')
                .map((cat) => (
                  <TableCell key={cat.id} sx={{ fontWeight: 'bold', width: 160 }}>
                    {cat.name}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {productUoms.map((uom) => {
              const isBase = uom.isBaseUnit
              const effectiveCost = getEffectiveCost(uom)
              const margins = uomMargins[uom.uomId] || { pct: '0', fixed: '0' }
              const prices = allUomPrices[uom.uomId] || {}

              return (
                <TableRow key={uom.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {uom.uomCode}
                    </Typography>
                    {isBase && (
                      <Chip
                        label="Base"
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: '0.6rem' }}
                      />
                    )}
                  </TableCell>

                  <TableCell>{uom.conversionFactor}</TableCell>

                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Tooltip
                        title={
                          uom.costOverride ? 'Manual Cost (Override)' : 'Auto-calculated from Base'
                        }
                      >
                        <IconButton
                          size="small"
                          color={uom.costOverride ? 'warning' : 'default'}
                          onClick={() => handleManualCostToggle(uom.uomId, uom.costOverride)}
                        >
                          {uom.costOverride ? (
                            <LockIcon fontSize="small" />
                          ) : (
                            <AutoFixHighIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>

                      {uom.costOverride ? (
                        <CurrencyInput
                          value={Number(uom.cost)}
                          onChange={(v) => handleManualCostChange(uom.uomId, v.toString())}
                          size="small"
                          sx={{ width: 120 }}
                        />
                      ) : (
                        <Typography variant="body2">
                          Rp {effectiveCost.toLocaleString('id-ID')}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      value={margins.pct}
                      onChange={(e) => handleMarginChange(uom.uomId, e.target.value)}
                      type="number"
                      inputProps={{ min: 0, step: 0.1 }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>

                  <TableCell sx={{ bgcolor: 'rgba(25, 118, 210, 0.15)' }}>
                    <CurrencyInput
                      value={Number(prices['RETAIL'] || 0)}
                      onChange={(v) => handleRetailPriceChange(uom.uomId, v.toString())}
                      size="small"
                      sx={{ width: '100%' }}
                    />
                  </TableCell>

                  {priceCategories
                    .filter((c) => c.id !== 'RETAIL')
                    .map((cat) => (
                      <TableCell key={cat.id}>
                        <CurrencyInput
                          value={Number(prices[cat.id] || 0)}
                          onChange={(v) => handleOtherPriceChange(uom.uomId, cat.id, v.toString())}
                          size="small"
                          sx={{ width: '100%' }}
                        />
                      </TableCell>
                    ))}
                </TableRow>
              )
            })}
            {/* Add UOM Row */}
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>
                <TextField
                  select
                  size="small"
                  value={newUomId}
                  onChange={(e) => setNewUomId(e.target.value)}
                  sx={{ width: 120 }}
                  placeholder="Pilih UOM"
                >
                  <MenuItem value="">+ Tambah</MenuItem>
                  {uomMasters
                    .filter((u) => !productUoms.some((pu) => pu.uomId === u.id))
                    .map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.code}
                      </MenuItem>
                    ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  type="number"
                  value={newConversionFactor}
                  onChange={(e) => setNewConversionFactor(e.target.value)}
                  sx={{ width: 80 }}
                  inputProps={{ min: 1 }}
                  disabled={!newUomId}
                />
              </TableCell>
              <TableCell colSpan={3 + priceCategories.filter((c) => c.id !== 'RETAIL').length}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddUom}
                  disabled={!newUomId}
                >
                  Tambah Satuan
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
