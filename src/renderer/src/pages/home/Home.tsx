import { useEffect, useState, useCallback } from 'react'
import { Box, Grid, Typography, CircularProgress } from '@mui/material'
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

const lowStockAlerts: LowStockAlert[] = [
  { name: 'Premium Dog Food 10kg', onHand: 3, reorderPoint: 10, severity: 'Critical' },
  { name: 'Cat Litter 10kg', onHand: 5, reorderPoint: 15, severity: 'Warning' }
]

const pendingReturns: PendingReturn[] = [
  { code: 'RT-1023', items: 2, days: 1 },
  { code: 'RT-1024', items: 5, days: 3 }
]

const unpaidInvoices: UnpaidInvoice[] = [
  { code: 'INV-2045', amount: 'Rp 3.500.000', status: '7 days overdue' },
  { code: 'INV-2048', amount: 'Rp 1.200.000', status: 'Due today' }
]

const topProducts: TopProduct[] = [
  {
    rank: 1,
    name: 'Premium Dog Food 10kg',
    sku: 'DOG-FOOD-001',
    category: 'Food',
    units: 142,
    revenue: 'Rp 18.900.000'
  },
  {
    rank: 2,
    name: 'Cat Kibble Salmon 5kg',
    sku: 'CAT-FOOD-002',
    category: 'Food',
    units: 121,
    revenue: 'Rp 15.200.000'
  },
  {
    rank: 3,
    name: 'Dog Shampoo Medicated',
    sku: 'DOG-CARE-003',
    category: 'Care',
    units: 88,
    revenue: 'Rp 9.800.000'
  },
  {
    rank: 4,
    name: 'Cat Litter 10kg',
    sku: 'CAT-LITTER-004',
    category: 'Care',
    units: 73,
    revenue: 'Rp 8.500.000'
  },
  {
    rank: 5,
    name: 'Pet Leash Nylon',
    sku: 'ACC-LEASH-005',
    category: 'Accessories',
    units: 65,
    revenue: 'Rp 6.200.000'
  }
]

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
    label: 'Pemasok',
    description: 'Kelola data pemasok',
    path: '/master-supplier'
  },
  {
    key: 'users',
    label: 'Pengguna',
    description: 'Kelola pengguna & peran',
    path: '/master-user'
  }
]

function Home(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true)
      const response = await window.api.db.transactions.getDashboardStats()
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardStats()
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      void loadDashboardStats()
    }, 60000)
    return () => clearInterval(interval)
  }, [loadDashboardStats])

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Box sx={{ width: '100%', p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Ringkasan Toko
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lihat performa hari ini dan hal yang perlu perhatian Anda.
          </Typography>
        </Box>
        <KpiSummary items={kpis} />

        <Grid container spacing={2} sx={{ height: 'calc(100% - 120px)' }}>
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
              lowStock={lowStockAlerts}
              pendingReturns={pendingReturns}
              unpaidInvoices={unpaidInvoices}
            />
            <QuickNavigation items={quickNavItems} onNavigate={handleNavigate} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Home
