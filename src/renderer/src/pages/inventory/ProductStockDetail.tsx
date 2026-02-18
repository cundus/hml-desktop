import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Tab,
  Tabs
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { ProductStockDetail } from 'src/preload/api/inventory'
import { format } from 'date-fns'
import ReferenceLink from '../../components/ReferenceLink'

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

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
      id={`stock-detail-tabpanel-${index}`}
      aria-labelledby={`stock-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number): Record<string, string> {
  return {
    id: `stock-detail-tab-${index}`,
    'aria-controls': `stock-detail-tabpanel-${index}`
  }
}

export default function ProductStockDetailPage(): React.ReactElement {
  const { productId } = useParams<{ productId: string }>()
  const [searchParams] = useSearchParams()
  const storeId = searchParams.get('storeId')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProductStockDetail | null>(null)
  const [tabValue, setTabValue] = useState(0)

  const loadData = async (): Promise<void> => {
    if (!productId || !storeId) {
      setError('Product ID or Store ID missing')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // FIX: Use api.db.inventory instead of api.inventory
      const res = await window.api.db.inventory.getProductStockDetails(productId, storeId)
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error || 'Failed to load details')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [productId, storeId])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || 'Data not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Kembali
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {data.product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SKU: {data.product.sku} | Unit: {data.product.unit} | Toko: {data.store.name}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Stok Fisik
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {data.stock.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.product.unit} di gudang
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Stok Tersedia
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                {data.stock.available}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Siap Jual
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Stok Dipesan / Reserved
              </Typography>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                {data.stock.reserved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Booking
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderLeft: '5px solid #2e7d32' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Nilai Aset
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(data.stock.totalAssetValue || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Harga Modal Tengah
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Stock detail tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<InventoryIcon />}
            label="Batch Aktif"
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            icon={<HistoryIcon />}
            label="Riwayat Transaksi"
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>

        {/* Batches Tab */}
        <TabPanel value={tabValue} index={0}>
          {data.batches.length === 0 ? (
            <Alert severity="info">Tidak ada batch aktif.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kode Batch</TableCell>
                    <TableCell>Kedaluwarsa</TableCell>
                    <TableCell align="right">Cost (Modal)</TableCell>
                    <TableCell align="right">Sisa Stok</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.batches.map((batch, index) => (
                    <TableRow key={batch.batchId || `unbatched-${index}`}>
                      <TableCell>
                        {batch.code ? (
                          <Chip label={batch.code} size="small" variant="outlined" />
                        ) : (
                          <Chip
                            label="Tanpa Batch"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.expiryDate ? format(new Date(batch.expiryDate), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR'
                        }).format(batch.cost)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {batch.quantity}
                      </TableCell>
                      <TableCell>
                        {batch.expiryDate && new Date(batch.expiryDate) < new Date() ? (
                          <Chip icon={<WarningIcon />} label="Expired" color="error" size="small" />
                        ) : (
                          <Chip label="Aktif" color="success" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell>Tipe</TableCell>
                  <TableCell>Referensi</TableCell>
                  <TableCell align="right">Jumlah</TableCell>
                  <TableCell>Oleh</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.history.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.createdAt), 'dd MMM yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Chip
                        label={txn.type}
                        size="small"
                        color={
                          ['INBOUND', 'RETURN'].includes(txn.type)
                            ? 'success'
                            : ['OUTBOUND', 'SALE', 'WASTE'].includes(txn.type)
                              ? 'error'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell><ReferenceLink reference={txn.reference} /></TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color:
                          ['INBOUND', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT'].includes(txn.type) &&
                          txn.quantity > 0 // Adjustment logic ambiguous? Assuming positive adj = green
                            ? 'success.main'
                            : 'error.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {['OUTBOUND', 'SALE', 'WASTE', 'TRANSFER_OUT'].includes(txn.type) ? '-' : '+'}
                      {txn.quantity}
                    </TableCell>
                    <TableCell>{txn.performedBy || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  )
}
