import React, { useState, useEffect } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Badge,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { StockOverviewItem, StockTransaction, StockAdjustment } from 'src/preload/api/inventory'
import { ProductUom } from 'src/preload/api/pricing'

import StockOverviewTab from './components/StockOverviewTab'
import StockTransactionsTab from './components/StockTransactionsTab'
import StockAdjustmentsTab from './components/StockAdjustmentsTab'
import StockAdjustmentDialog from './components/StockAdjustmentDialog'
import BatchesPage from './Batches'
import useBranchConfig from '@renderer/hooks/useBranchConfig'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps): React.ReactElement {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number): Record<string, string> {
  return {
    id: `inventory-tab-${index}`,
    'aria-controls': `inventory-tabpanel-${index}`
  }
}

export default function InventoryPage(): React.ReactElement {
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stockOverview, setStockOverview] = useState<StockOverviewItem[]>([])
  const [transactions, setTransactions] = useState<
    (StockTransaction & { productName: string; storeName: string })[]
  >([])
  const [adjustments, setAdjustments] = useState<
    (StockAdjustment & { productName: string; storeName: string })[]
  >([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<{ productId: string; storeId: string } | null>(null)
  const [uoms, setUoms] = useState<ProductUom[]>([])

  const { storeId: branchStoreId } = useBranchConfig()
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [stores, setStores] = useState<{ id: string; name: string }[]>([])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      let currentStoreId = branchStoreId || selectedStoreId

      // Load stores if admin (no branch store)
      if (!branchStoreId) {
        const storesRes = await window.api.db.stores.getAll()
        if (storesRes.success && storesRes.data) {
          setStores(storesRes.data)
          if (!currentStoreId && storesRes.data.length > 0) {
            currentStoreId = storesRes.data[0].id
            setSelectedStoreId(currentStoreId)
          }
        }
      }

      // Use branch store if set, otherwise use selected store
      const storeId = currentStoreId

      if (!storeId) {
        setLoading(false)
        return
      }

      // Load stock overview
      const overviewResult = await window.api.db.inventory.getStockOverview(storeId)
      if (overviewResult.success) {
        setStockOverview(overviewResult.data)
        const lowStockItems = overviewResult.data.filter((item) => item.isLowStock)
        setLowStockCount(lowStockItems.length)
      } else {
        setError(overviewResult.error || 'Failed to load stock overview')
      }

      // Load UOMs for smart display
      const uomResult = await window.api.db.pricing.getAllProductUoms()
      if (uomResult.success) {
        setUoms(uomResult.data)
      }

      // Load transactions
      const transactionsResult = await window.api.db.inventory.getStockTransactions({
        storeId,
        limit: 100
      })
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data)
      }

      // Load adjustments
      const adjustmentsResult = await window.api.db.inventory.getStockAdjustments({ storeId })
      if (adjustmentsResult.success) {
        setAdjustments(adjustmentsResult.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [branchStoreId, selectedStoreId])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue)
  }

  const handleAdjustmentCreated = (): void => {
    // Reload data after creating adjustment
    loadData()
    // Switch to adjustments tab to see the new entry
    setTabValue(2)
  }

  const handleQuickAdjust = (productId: string, storeId: string): void => {
    setQuickAdjustProduct({ productId, storeId })
    setAdjustmentDialogOpen(true)
  }

  const handleAdjustmentClose = (): void => {
    setAdjustmentDialogOpen(false)
    setQuickAdjustProduct(null)
  }

  const handleStoreChange = (event: any): void => {
    setSelectedStoreId(event.target.value)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1">
            <InventoryIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Manajemen Inventori
          </Typography>
          {lowStockCount > 0 && (
            <Badge badgeContent={lowStockCount} color="error">
              <Tooltip title={`${lowStockCount} items dengan stok rendah`}>
                <WarningIcon color="error" />
              </Tooltip>
            </Badge>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Show store selector only for admin (no branch store) */}
          {!branchStoreId && stores.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Toko</InputLabel>
              <Select value={selectedStoreId} label="Toko" onChange={handleStoreChange}>
                {stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button variant="contained" onClick={() => setAdjustmentDialogOpen(true)}>
            Penyesuaian Stok
          </Button>
          <IconButton onClick={loadData} title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Highlights active store */}
      {(branchStoreId || selectedStoreId) && (
        <Box sx={{ mb: 3, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Menampilkan stok untuk toko:
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="primary">
            {branchStoreId
              ? 'Cabang Ini'
              : stores.find((s) => s.id === selectedStoreId)?.name || 'Unknown'}
          </Typography>
        </Box>
      )}

      {lowStockCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Anda memiliki {lowStockCount} item dengan stok rendah. Pertimbangkan untuk segera mengisi
          ulang.
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Inventory management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Ringkasan Stok" {...a11yProps(0)} />
          <Tab label="Transaksi" {...a11yProps(1)} />
          <Tab label="Penyesuaian" {...a11yProps(2)} />
          <Tab label="Batch" {...a11yProps(3)} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <StockOverviewTab 
            data={stockOverview}
            uoms={uoms}
            onRefresh={loadData}
            onQuickAdjust={handleQuickAdjust}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <StockTransactionsTab data={transactions} onRefresh={loadData} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <StockAdjustmentsTab data={adjustments} onRefresh={loadData} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <BatchesPage />
        </TabPanel>
      </Paper>

      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onClose={handleAdjustmentClose}
        onSuccess={handleAdjustmentCreated}
        initialProductId={quickAdjustProduct?.productId}
        initialStoreId={quickAdjustProduct?.storeId || branchStoreId || selectedStoreId}
      />
    </Box>
  )
}
