import { useEffect, useState, useCallback } from 'react'
import { Box, Grid, Typography, CircularProgress, MenuItem, TextField } from '@mui/material'
import useAuth from '../../hooks/useAuth'
import KpiSummary, { type KpiItem } from './components/KpiSummary'
import SalesPerformanceCard from './components/SalesPerformanceCard'
import TopProductsList, { type TopProduct } from './components/TopProductsList'
import AlertsPanel, {
  type LowStockAlert,
  type PendingReturn,
  type UnpaidInvoice
} from './components/AlertsPanel'
import QuickNavigation, { type QuickNavItem } from './components/QuickNavigation'

interface DashboardStats {
  todayRevenue: number
  todayTransactions: number
  weekRevenue: number
  weekTransactions: number
  monthRevenue: number
  monthTransactions: number
  totalProducts: number
  totalCustomers: number
  lowStockCount: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}


const quickNavItems: QuickNavItem[] = [
  { key: 'pos', label: 'Kasir', description: 'Buka terminal kasir', path: '/sales' },
  {
    key: 'inventory',
    label: 'Inventori',
    description: 'Stok & penyesuaian',
    path: '/inventory/dashboard'
  },
  {
    key: 'reports',
    label: 'Laporan',
    description: 'Laporan penjualan',
    path: '/sales/reports'
  },
  {
    key: 'suppliers',
    label: 'Supplier',
    description: 'Kelola data supplier',
    path: '/master-supplier'
  },
  {
    key: 'users',
    label: 'Pengguna',
    description: 'Kelola pengguna & peran',
    path: '/master-user'
  },
  {
    key: 'product-management',
    label: 'Manajemen Produk',
    description: 'Kelola produk, harga & stok',
    path: '/products'
  }
]

function Home(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [alerts, setAlerts] = useState<{
    lowStock: LowStockAlert[]
    pendingReturns: PendingReturn[]
    unpaidInvoices: UnpaidInvoice[]
  }>({
    lowStock: [],
    pendingReturns: [],
    unpaidInvoices: []
  })
  
  // Store Filter State
  const [stores, setStores] = useState<{ id: string; name: string }[]>([])
  const [selectedStore, setSelectedStore] = useState('')

  const { hasPermission } = useAuth()
  const canViewDashboard = hasPermission('dashboard.view')

  // Load stores on mount
  useEffect(() => {
    if (canViewDashboard) {
      void window.api.db.stores.getAll().then((res) => {
        if (res.success && res.data) {
          setStores(res.data)
        }
      })
    }
  }, [canViewDashboard])

  const loadDashboardData = useCallback(async () => {
    if (!canViewDashboard) return
    try {
      setLoading(true)
      const storeIdArg = selectedStore || undefined
      
      const [statsRes, topProductsRes, alertsRes] = await Promise.all([
        window.api.db.transactions.getDashboardStats(storeIdArg),
        window.api.db.transactions.getTopProducts(5, storeIdArg),
        window.api.db.transactions.getDashboardAlerts(storeIdArg)
      ])

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
      
      if (topProductsRes.success && topProductsRes.data) {
        // Map backend top products to frontend component format
        setTopProducts(topProductsRes.data.map(p => ({
            ...p,
            revenue: formatCurrency(p.revenue) // convert number to formatted string for component
        })))
      }

      if (alertsRes.success && alertsRes.data) {
        setAlerts(alertsRes.data)
      }

    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [canViewDashboard, selectedStore])

  useEffect(() => {
    if (!canViewDashboard) return
    void loadDashboardData()
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      void loadDashboardData()
    }, 60000)
    return () => clearInterval(interval)
  }, [canViewDashboard, loadDashboardData])

  const handleNavigate = (path: string): void => {
    window.location.hash = `#${path}`
  }

  const kpis: KpiItem[] = [
    {
      key: 'revenue-today',
      label: 'Pendapatan (Hari Ini)',
      value: stats ? formatCurrency(stats.todayRevenue) : '-',
      changeLabel: `${stats?.todayTransactions ?? 0} transaksi`,
      changeColor: 'success.main',
      type: 'revenue'
    },
    {
      key: 'revenue-week',
      label: 'Pendapatan (Minggu Ini)',
      value: stats ? formatCurrency(stats.weekRevenue) : '-',
      changeLabel: `${stats?.weekTransactions ?? 0} transaksi`,
      changeColor: 'success.main',
      type: 'revenue'
    },
    {
      key: 'revenue-month',
      label: 'Pendapatan (Bulan Ini)',
      value: stats ? formatCurrency(stats.monthRevenue) : '-',
      changeLabel: `${stats?.monthTransactions ?? 0} transaksi`,
      changeColor: 'primary.main',
      type: 'revenue'
    },
    {
      key: 'total-products',
      label: 'Total Produk',
      value: String(stats?.totalProducts ?? 0),
      changeLabel: 'Produk aktif',
      changeColor: 'info.main',
      type: 'orders'
    },
    {
      key: 'total-customers',
      label: 'Total Pelanggan',
      value: String(stats?.totalCustomers ?? 0),
      changeLabel: stats?.lowStockCount ? `${stats.lowStockCount} stok rendah` : 'Semua stok aman',
      changeColor: stats?.lowStockCount ? 'warning.main' : 'success.main',
      type: 'inventory'
    }
  ]

  // If user cannot view dashboard, show simple welcome screen instead
  if (!canViewDashboard) {
    return (
      <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
        <Box sx={{ width: '100%', p: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Selamat Datang di Petshop POS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gunakan menu navigasi cepat di bawah ini untuk mengakses fitur yang Anda miliki izin
              untuk mengelola.
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid
              size={{ xs: 12, md: 8 }}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Navigasi Cepat
              </Typography>
              <QuickNavigation items={quickNavItems} onNavigate={handleNavigate} />
            </Grid>
          </Grid>
        </Box>
      </Box>
    )
  }

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Box sx={{ width: '100%', p: 2 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                Ringkasan Toko
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Lihat performa hari ini dan hal yang perlu perhatian Anda.
            </Typography>
          </Box>
          <Box>
            <TextField
              select
              label="Toko"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">Semua Toko</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* Quick Navigation - Top Bar */}
        <Box sx={{ mb: 3 }}>
          <QuickNavigation items={quickNavItems} onNavigate={handleNavigate} />
        </Box>

        <KpiSummary items={kpis} />

        <Grid container spacing={2} sx={{ height: 'calc(100% - 220px)' }}>
          <Grid
            size={{ xs: 12, md: 8 }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}
          >
            <SalesPerformanceCard />
            <TopProductsList items={topProducts} />
          </Grid>

          <Grid
            size={{ xs: 12, md: 4 }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}
          >
            <AlertsPanel
              lowStock={alerts.lowStock}
              pendingReturns={alerts.pendingReturns}
              unpaidInvoices={alerts.unpaidInvoices}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Home
