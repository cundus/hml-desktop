import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import CopyAllIcon from '@mui/icons-material/CopyAll'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material'
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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import CategoryIcon from '@mui/icons-material/Category'
import StoreIcon from '@mui/icons-material/Store'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
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

interface Store {
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

  // Store-specific cost state
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [storeCost, setStoreCost] = useState<string>('0')
  const [hasStoreCost, setHasStoreCost] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [sourceCopyStoreId, setSourceCopyStoreId] = useState('')

  // Add UOM state
  const [uomMasters, setUomMasters] = useState<{ id: string; code: string; name: string }[]>([])
  const [newUomId, setNewUomId] = useState('')
  const [newConversionFactor, setNewConversionFactor] = useState('1')

  // Load stores on mount
  useEffect(() => {
    const loadStores = async (): Promise<void> => {
      try {
        const res = await window.api.db.stores.getAll()
        const storeList = (res.data ?? []).map((s) => ({ id: s.id, name: s.name }))
        setStores(storeList)
        // Auto-select first store
        if (storeList.length > 0 && !selectedStoreId) {
          setSelectedStoreId(storeList[0].id)
        }
      } catch (error) {
        console.error('Failed to load stores', error)
      }
    }
    loadStores()
  }, [])

  // Load store-specific cost when store changes
  const loadStoreCost = useCallback(async (): Promise<void> => {
    if (!selectedStoreId || !productId) return

    try {
      const res = await window.api.db.productPrices.getByProductAndStore(productId, selectedStoreId)
      if (res.data) {
        setStoreCost(res.data.cost)
        setHasStoreCost(true)
      } else {
        // No store-specific cost, use base cost
        setStoreCost(baseCost)
        setHasStoreCost(false)
      }
    } catch (error) {
      console.error('Failed to load store cost', error)
      setStoreCost(baseCost)
      setHasStoreCost(false)
    }
  }, [selectedStoreId, productId, baseCost])

  useEffect(() => {
    if (selectedStoreId && baseCost) {
      loadStoreCost()
    }
  }, [selectedStoreId, baseCost, loadStoreCost])

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

      // Load prices for each UOM - use store-specific prices if store is selected
      const pricesMap: Record<string, Record<string, string>> = {}
      const marginsMap: Record<string, { pct: string; fixed: string }> = {}
      const storeToUse = selectedStoreId || (stores.length > 0 ? stores[0].id : '')

      for (const uom of uomRows) {
        // Use getAvailableCategoryPrices which returns store-specific or fallback to default
        const pricesRes = await window.api.db.pricing.getAvailableCategoryPrices({
          productId,
          uomId: uom.uomId,
          storeId: storeToUse
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

  // Load store-specific prices when store changes
  const loadStorePrices = useCallback(async (): Promise<void> => {
    if (!selectedStoreId || productUoms.length === 0) return

    try {
      const pricesMap: Record<string, Record<string, string>> = {}
      const marginsMap: Record<string, { pct: string; fixed: string }> = {}
      const currentBaseCost = hasStoreCost ? Number(storeCost) : Number(baseCost)

      for (const uom of productUoms) {
        const pricesRes = await window.api.db.pricing.getAvailableCategoryPrices({
          productId,
          uomId: uom.uomId,
          storeId: selectedStoreId
        })
        const catPrices = pricesRes.data ?? []
        pricesMap[uom.uomId] = {}
        for (const cp of catPrices) {
          pricesMap[uom.uomId][cp.priceCategoryId] = cp.price
        }

        // Calculate margin from retail price
        const retailPrice = Number(pricesMap[uom.uomId]['RETAIL'] || 0)
        const effectiveCost = uom.costOverride
          ? Number(uom.cost || 0)
          : currentBaseCost * uom.conversionFactor
        const marginFixed = retailPrice - effectiveCost
        const marginPct = effectiveCost > 0 ? (marginFixed / effectiveCost) * 100 : 0
        marginsMap[uom.uomId] = {
          pct: marginPct.toFixed(1),
          fixed: marginFixed.toString()
        }
      }

      setAllUomPrices(pricesMap)
      setUomMargins(marginsMap)
    } catch (error) {
      console.error('Failed to load store prices', error)
    }
  }, [selectedStoreId, productId, productUoms, baseCost, storeCost, hasStoreCost])

  // Reload prices when store changes
  useEffect(() => {
    if (selectedStoreId && productUoms.length > 0) {
      loadStorePrices()
    }
  }, [selectedStoreId, loadStorePrices])

  // Get effective cost considering store-specific cost
  const getEffectiveCost = (uom: ProductUomRow): number => {
    // Use store cost if available, otherwise base cost
    const currentBaseCost = hasStoreCost ? Number(storeCost) : Number(baseCost)
    
    if (uom.costOverride && uom.cost) {
      return Number(uom.cost)
    }
    return currentBaseCost * uom.conversionFactor
  }

  // Recalculate margins when store cost changes
  useEffect(() => {
    if (productUoms.length > 0 && Object.keys(allUomPrices).length > 0) {
      const currentBaseCost = hasStoreCost ? Number(storeCost) : Number(baseCost)
      const newMargins: Record<string, { pct: string; fixed: string }> = {}
      
      for (const uom of productUoms) {
        const prices = allUomPrices[uom.uomId] || {}
        const retailPrice = Number(prices['RETAIL'] || 0)
        
        // Calculate effective cost inline to avoid stale closure
        let effectiveCost = currentBaseCost * uom.conversionFactor
        if (uom.costOverride && uom.cost) {
          effectiveCost = Number(uom.cost)
        }
        
        const fixed = retailPrice - effectiveCost
        const pct = effectiveCost > 0 ? (fixed / effectiveCost) * 100 : 0
        newMargins[uom.uomId] = { pct: pct.toFixed(1), fixed: fixed.toString() }
      }
      setUomMargins(newMargins)
    }
  }, [storeCost, hasStoreCost, baseCost, productUoms, allUomPrices])

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
      // Always save store-specific cost when a store is selected
      if (selectedStoreId) {
        await window.api.db.productPrices.upsertCost(productId, selectedStoreId, storeCost)
      }

      // Save prices per store (using upsertStorePrice)
      if (selectedStoreId) {
        for (const uom of productUoms) {
          const prices = allUomPrices[uom.uomId] || {}
          for (const [categoryId, price] of Object.entries(prices)) {
            await window.api.db.pricing.upsertStorePrice({
              productId,
              uomId: uom.uomId,
              priceCategoryId: categoryId,
              storeId: selectedStoreId,
              price
            })
          }
        }
      }
      globalAlert.success('Harga berhasil disimpan')
      setHasStoreCost(true)
      
      // Reload data to reflect saved changes
      await loadStoreCost()
    } catch (error) {
      console.error('Failed to save prices', error)
      globalAlert.error('Gagal menyimpan harga')
    } finally {
      setSaving(false)
    }
  }

  const handleStoreCostChange = (newCost: number): void => {
    setStoreCost(newCost.toString())
  }

  const handleDeleteUom = async (id: string, uomCode: string): Promise<void> => {
    const confirmed = await globalAlert.confirm(
      `Hapus satuan "${uomCode}"? Data harga untuk satuan ini juga akan dihapus.`,
      'Hapus Satuan'
    )
    if (!confirmed) return

    try {
      await window.api.db.pricing.deleteProductUom(id)
      globalAlert.success(`Satuan ${uomCode} berhasil dihapus`)
      loadData()
    } catch (error) {
      console.error('Failed to delete UOM', error)
      globalAlert.error('Gagal menghapus satuan')
    }
  }

  const handleCopyConfirm = async (): Promise<void> => {
    if (!sourceCopyStoreId || !selectedStoreId) return

    try {
      setLoading(true)
      const res = await window.api.db.pricing.copyProductPricesFromStore({
        productId,
        sourceStoreId: sourceCopyStoreId,
        targetStoreId: selectedStoreId
      })
      if (res.success) {
        globalAlert.success(`Berhasil menyalin ${res.data.count} harga`)
        setCopyDialogOpen(false)
        await loadStorePrices()
      } else {
        globalAlert.error(res.error || 'Gagal menyalin harga')
      }
    } catch (error) {
      console.error('Failed to copy prices', error)
      globalAlert.error(error instanceof Error ? error.message : 'Gagal menyalin harga')
    } finally {
      setLoading(false)
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
      {/* Store Selector */}
      <Stack direction="row" spacing={2} alignItems="center" mb={2} mt={2}>
        <StoreIcon color="action" />
        <FormControl size="small" sx={{ minWidth: 200 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Harga Modal Toko:
          </Typography>
          <CurrencyInput
            value={Number(storeCost)}
            onChange={handleStoreCostChange}
            size="small"
            sx={{ width: 150 }}
          />
          {hasStoreCost && (
            <Chip label="Custom" size="small" color="info" variant="outlined" />
          )}
          {!hasStoreCost && (
            <Chip label="Default" size="small" color="default" variant="outlined" />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          (Default: Rp {Number(baseCost).toLocaleString('id-ID')})
        </Typography>
      </Stack>

      {/* Action Buttons */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} mb={2}>
        <Button
          variant="text"
          startIcon={<CategoryIcon />}
          onClick={() => navigate('/pricing/categories')}
          sx={{ mr: 2 }}
        >
          Atur Kategori
        </Button>
        <Button
            variant="outlined"
            startIcon={<CopyAllIcon />}
            onClick={() => setCopyDialogOpen(true)}
            disabled={!selectedStoreId || stores.length < 2}
            sx={{ mr: 'auto' }}
        >
            Salin Harga
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
              <TableCell sx={{ fontWeight: 'bold', width: 60 }}>Aksi</TableCell>
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
                      disabled
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
                  <TableCell>
                    {!uom.isBaseUnit && (
                      <Tooltip title="Hapus satuan">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUom(uom.id, uom.uomCode)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
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

      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)}>
        <DialogTitle>Salin Harga dari Toko Lain</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Pilih toko sumber untuk menyalin harga ke toko{' '}
            <strong>{stores.find((s) => s.id === selectedStoreId)?.name}</strong>. Harga yang sudah
            ada akan ditimpa.
          </DialogContentText>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Toko Sumber</InputLabel>
            <Select
              value={sourceCopyStoreId}
              label="Toko Sumber"
              onChange={(e) => setSourceCopyStoreId(e.target.value)}
            >
              {stores
                .filter((s) => s.id !== selectedStoreId)
                .map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Batal</Button>
          <Button onClick={handleCopyConfirm} variant="contained" disabled={!sourceCopyStoreId}>
            Salin Harga
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
