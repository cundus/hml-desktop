import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarningIcon from '@mui/icons-material/Warning'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

interface DashboardMetrics {
  totalProducts: number
  totalStores: number
  lowStockItems: number
  expiringBatches: number
}

interface LowStockItem {
  productId: string
  productName: string
  storeId: string
  storeName: string
  quantity: number
  reservedQuantity: number
}

interface ExpiringBatch {
  id: string
  productId: string
  productName: string
  code: string
  expiryDate: Date
  daysUntilExpiry: number
}

interface RecentTransaction {
  id: string
  productName: string
  storeName: string
  type: string
  quantity: number
  createdAt: Date
}

export default function InventoryDashboard(): React.JSX.Element {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    totalStores: 0,
    lowStockItems: 0,
    expiringBatches: 0
  })
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all required data
      const [productsRes, storesRes, locationsRes, batchesRes, transactionsRes] =
        await Promise.all([
          window.api.db.products.getAll(),
          window.api.db.stores.getAll(),
          window.api.db.productLocations.getAll(),
          window.api.db.batches.getExpiring(30),
          window.api.db.stockTransactions.getAll()
        ])

      if (
        !productsRes.success ||
        !storesRes.success ||
        !locationsRes.success ||
        !batchesRes.success ||
        !transactionsRes.success
      ) {
        setError('Gagal memuat data dashboard')
        return
      }

      const products = productsRes.data ?? []
      const stores = storesRes.data ?? []
      const locations = locationsRes.data ?? []
      const batches = batchesRes.data ?? []
      const transactions = transactionsRes.data ?? []

      // Create lookup maps
      const productsMap = new Map(products.map((p) => [p.id, p.name]))
      const storesMap = new Map(stores.map((s) => [s.id, s.name]))

      // Calculate low stock items (quantity < 10)
      const lowStock = locations
        .filter((loc) => loc.quantity - loc.reservedQuantity < 10)
        .map((loc) => ({
          productId: loc.productId,
          productName: productsMap.get(loc.productId) || 'Unknown',
          storeId: loc.storeId,
          storeName: storesMap.get(loc.storeId) || 'Unknown',
          quantity: loc.quantity,
          reservedQuantity: loc.reservedQuantity
        }))
        .slice(0, 10)

      // Process expiring batches
      const expiring = batches
        .map((batch) => {
          const daysUntilExpiry = batch.expiryDate
            ? Math.floor(
                (new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : 999
          return {
            id: batch.id,
            productId: batch.productId,
            productName: productsMap.get(batch.productId) || 'Unknown',
            code: batch.code,
            expiryDate: batch.expiryDate || new Date(),
            daysUntilExpiry
          }
        })
        .filter((b) => b.daysUntilExpiry <= 30)
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 10)

      // Get recent transactions (last 10)
      const recent = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((txn) => ({
          id: txn.id,
          productName: productsMap.get(txn.productId) || 'Unknown',
          storeName: storesMap.get(txn.storeId) || 'Unknown',
          type: txn.type,
          quantity: txn.quantity,
          createdAt: txn.createdAt
        }))

      // Set metrics
      setMetrics({
        totalProducts: products.length,
        totalStores: stores.length,
        lowStockItems: lowStock.length,
        expiringBatches: expiring.length
      })

      setLowStockItems(lowStock)
      setExpiringBatches(expiring)
      setRecentTransactions(recent)
    } catch (err) {
      setError('Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString()
  }

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString()
  }

  const getTypeColor = (type: string): 'success' | 'error' | 'info' | 'warning' => {
    switch (type) {
      case 'INBOUND':
      case 'TRANSFER_IN':
        return 'success'
      case 'OUTBOUND':
      case 'TRANSFER_OUT':
      case 'SALE':
        return 'error'
      case 'ADJUSTMENT':
        return 'warning'
      default:
        return 'info'
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Dashboard Inventori
      </Typography>

      {/* Metrics Cards */}
      <Stack direction="row" spacing={3} mb={3} sx={{ flexWrap: 'wrap', gap: 3 }}>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <InventoryIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{metrics.totalProducts}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Produk
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{metrics.totalStores}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Toko
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{metrics.lowStockItems}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Stok Rendah
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AttachMoneyIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{metrics.expiringBatches}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Batch Kadaluarsa
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Alerts */}
      {(metrics.lowStockItems > 0 || metrics.expiringBatches > 0) && (
        <Stack spacing={2} mb={3}>
          {metrics.lowStockItems > 0 && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="subtitle2" fontWeight="bold">
                {metrics.lowStockItems} item(s) memiliki stok rendah
              </Typography>
            </Alert>
          )}
          {metrics.expiringBatches > 0 && (
            <Alert severity="error" icon={<WarningIcon />}>
              <Typography variant="subtitle2" fontWeight="bold">
                {metrics.expiringBatches} batch akan kadaluarsa dalam 30 hari
              </Typography>
            </Alert>
          )}
        </Stack>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Peringatan Stok Rendah
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Produk berikut memiliki stok di bawah 10 unit:
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produk</TableCell>
                  <TableCell>Toko</TableCell>
                  <TableCell align="right">Tersedia</TableCell>
                  <TableCell align="right">Dipesan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStockItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.storeName}</TableCell>
                    <TableCell align="right">
                      {item.quantity - item.reservedQuantity}
                    </TableCell>
                    <TableCell align="right">{item.reservedQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Expiring Batches */}
      {expiringBatches.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              Peringatan Batch Kadaluarsa
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Batch berikut akan kadaluarsa dalam 30 hari:
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produk</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Tanggal Kadaluarsa</TableCell>
                  <TableCell align="right">Hari Hingga Kadaluarsa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expiringBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{batch.productName}</TableCell>
                    <TableCell>{batch.code}</TableCell>
                    <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${batch.daysUntilExpiry} hari`}
                        color={batch.daysUntilExpiry <= 7 ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Recent Transactions */}
      <Paper>
        <Box p={2}>
          <Typography variant="h6" mb={2}>
            Transaksi Terbaru
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tanggal</TableCell>
                <TableCell>Produk</TableCell>
                <TableCell>Toko</TableCell>
                <TableCell>Tipe</TableCell>
                <TableCell align="right">Jumlah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{formatDateTime(txn.createdAt)}</TableCell>
                  <TableCell>{txn.productName}</TableCell>
                  <TableCell>{txn.storeName}</TableCell>
                  <TableCell>
                    <Chip label={txn.type} color={getTypeColor(txn.type)} size="small" />
                  </TableCell>
                  <TableCell align="right">{txn.quantity}</TableCell>
                </TableRow>
              ))}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Tidak ada transaksi terbaru
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  )
}
