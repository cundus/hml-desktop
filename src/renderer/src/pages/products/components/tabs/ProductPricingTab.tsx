import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import CategoryIcon from '@mui/icons-material/Category'
import CurrencyInput from '../../../../components/CurrencyInput'
import { globalAlert } from '../../../../lib/globalAlert'

interface ProductUomRow {
  id: string
  uomId: string
  uomCode: string
  uomName: string
  conversionFactor: number
  isBaseUnit: boolean
  cost: string | null
  costOverride: boolean
}

interface PriceCategory {
  id: string
  name: string
}

interface ProductPricingTabProps {
  productId: string
}

export default function ProductPricingTab({
  productId
}: ProductPricingTabProps): React.JSX.Element {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [productUoms, setProductUoms] = useState<ProductUomRow[]>([])
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([])
  const [allUomPrices, setAllUomPrices] = useState<Record<string, Record<string, string>>>({})
  const [uomMargins, setUomMargins] = useState<Record<string, { pct: string; fixed: string }>>({})
  const [baseCost, setBaseCost] = useState('0')

  // Add UOM state
  const [uomMasters, setUomMasters] = useState<{ id: string; code: string; name: string }[]>([])
  const [newUomId, setNewUomId] = useState('')
  const [newConversionFactor, setNewConversionFactor] = useState('1')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    try {
      // Load product for base cost
      const productRes = await window.api.db.products.getById(productId)
      if (productRes.data) {
        setBaseCost(productRes.data.cost ?? '0')
      }

      // Load UOM masters
      const uomsRes = await window.api.db.uoms.getAll()
      setUomMasters((uomsRes.data ?? []).map((u) => ({ id: u.id, code: u.code, name: u.name })))

      // Load price categories
      const catRes = await window.api.db.pricing.getPriceCategories()
      setPriceCategories(catRes.data ?? [])

      // Load product UOMs
      const productUomsRes = await window.api.db.pricing.getProductUomsByProduct(productId)
      const seenUoms = new Set<string>()
      const uomRows = (productUomsRes.data ?? [])
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

      setProductUoms(uomRows)

      // Load prices for each UOM
      const pricesMap: Record<string, Record<string, string>> = {}
      const marginsMap: Record<string, { pct: string; fixed: string }> = {}

      for (const uom of uomRows) {
        const pricesRes = await window.api.db.pricing.getCategoryPrices({
          productId,
          uomId: uom.uomId
        })
        const catPrices = pricesRes.data ?? []
        pricesMap[uom.uomId] = {}
        for (const cp of catPrices) {
          pricesMap[uom.uomId][cp.priceCategoryId] = cp.price
        }

        // Calculate margin from retail price
        const retailPrice = Number(pricesMap[uom.uomId]['RETAIL'] || 0)
        const uomCost = uom.costOverride
          ? Number(uom.cost || 0)
          : Number(productRes.data?.cost || 0) * uom.conversionFactor
        const marginFixed = retailPrice - uomCost
        const marginPct = uomCost > 0 ? (marginFixed / uomCost) * 100 : 0
        marginsMap[uom.uomId] = {
          pct: marginPct.toFixed(1),
          fixed: marginFixed.toString()
        }
      }

      setAllUomPrices(pricesMap)
      setUomMargins(marginsMap)
    } catch (error) {
      console.error('Failed to load pricing data', error)
    } finally {
      setLoading(false)
    }
  }

  const getEffectiveCost = (uom: ProductUomRow): number => {
    if (uom.costOverride && uom.cost) {
      return Number(uom.cost)
    }
    return Number(baseCost) * uom.conversionFactor
  }

  const handleMarginChange = (uomId: string, newPct: string): void => {
    const uom = productUoms.find((u) => u.uomId === uomId)
    if (!uom) return

    const pct = Number(newPct) || 0
    const cost = getEffectiveCost(uom)
    const fixed = Math.round(cost * (pct / 100))
    const retailPrice = cost + fixed

    setUomMargins((prev) => ({
      ...prev,
      [uomId]: { pct: newPct, fixed: fixed.toString() }
    }))
    setAllUomPrices((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], RETAIL: retailPrice.toString() }
    }))
  }

  const handleRetailPriceChange = (uomId: string, newPrice: string): void => {
    const uom = productUoms.find((u) => u.uomId === uomId)
    if (!uom) return

    const price = Number(newPrice) || 0
    const cost = getEffectiveCost(uom)
    const fixed = price - cost
    const pct = cost > 0 ? (fixed / cost) * 100 : 0

    setAllUomPrices((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], RETAIL: newPrice }
    }))
    setUomMargins((prev) => ({
      ...prev,
      [uomId]: { pct: pct.toFixed(1), fixed: fixed.toString() }
    }))
  }

  const handleOtherPriceChange = (uomId: string, categoryId: string, newPrice: string): void => {
    setAllUomPrices((prev) => ({
      ...prev,
      [uomId]: { ...prev[uomId], [categoryId]: newPrice }
    }))
  }

  const handleAddUom = async (): Promise<void> => {
    if (!newUomId) return
    const uomMaster = uomMasters.find((u) => u.id === newUomId)
    if (!uomMaster) return

    try {
      const res = await window.api.db.pricing.createProductUom({
        productId,
        uomId: uomMaster.id,
        conversionFactor: Number(newConversionFactor) || 1,
        isBaseUnit: productUoms.length === 0
      })
      if (res.success) {
        globalAlert.success('UOM berhasil ditambahkan')
        setNewUomId('')
        setNewConversionFactor('1')
        loadData()
      }
    } catch (error) {
      console.error('Failed to add UOM', error)
      globalAlert.error('Gagal menambah UOM')
    }
  }

  const handleSaveAll = async (): Promise<void> => {
    setSaving(true)
    try {
      for (const uom of productUoms) {
        const prices = allUomPrices[uom.uomId] || {}
        for (const [categoryId, price] of Object.entries(prices)) {
          await window.api.db.pricing.upsertCategoryPrice({
            productId,
            uomId: uom.uomId,
            priceCategoryId: categoryId,
            price
          })
        }
      }
      globalAlert.success('Harga berhasil disimpan')
    } catch (error) {
      console.error('Failed to save prices', error)
      globalAlert.error('Gagal menyimpan harga')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Action Buttons */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} mb={2}>
        <Button
          variant="text"
          startIcon={<CategoryIcon />}
          onClick={() => navigate('/pricing/categories')}
          sx={{ mr: 'auto' }}
        >
          Atur Kategori
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : 'Simpan Semua Harga'}
        </Button>
      </Stack>

      {/* Pricing Matrix */}
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Satuan</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Konversi</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Harga Modal</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Margin %</TableCell>
              <TableCell
                sx={{ fontWeight: 'bold', bgcolor: 'primary.dark', color: 'primary.contrastText' }}
              >
                Harga Retail
              </TableCell>
              {priceCategories
                .filter((c) => c.id !== 'RETAIL')
                .map((cat) => (
                  <TableCell key={cat.id} sx={{ fontWeight: 'bold' }}>
                    {cat.name}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {productUoms.map((uom) => {
              const effectiveCost = getEffectiveCost(uom)
              const margins = uomMargins[uom.uomId] || { pct: '0', fixed: '0' }
              const prices = allUomPrices[uom.uomId] || {}

              return (
                <TableRow key={uom.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" fontWeight="bold">
                        {uom.uomCode}
                      </Typography>
                      {uom.isBaseUnit && (
                        <Chip label="Base" size="small" color="success" sx={{ height: 20 }} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{uom.conversionFactor}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      Rp {effectiveCost.toLocaleString('id-ID')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={margins.pct}
                      onChange={(e) => handleMarginChange(uom.uomId, e.target.value)}
                      type="number"
                      sx={{ width: 80 }}
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
    </Box>
  )
}
