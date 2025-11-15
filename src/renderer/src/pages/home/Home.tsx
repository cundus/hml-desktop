import { Box, Grid, Typography } from '@mui/material'
import KpiSummary, { type KpiItem } from './components/KpiSummary'
import SalesPerformanceCard from './components/SalesPerformanceCard'
import TopProductsList, { type TopProduct } from './components/TopProductsList'
import AlertsPanel, {
  type LowStockAlert,
  type PendingReturn,
  type UnpaidInvoice
} from './components/AlertsPanel'
import QuickNavigation, { type QuickNavItem } from './components/QuickNavigation'

const kpis: KpiItem[] = [
  {
    key: 'revenue-today',
    label: 'Revenue (Today)',
    value: 'Rp 12.450.000',
    changeLabel: '+8.2% vs yesterday',
    changeColor: 'success.main',
    type: 'revenue'
  },
  {
    key: 'revenue-week',
    label: 'Revenue (This Week)',
    value: 'Rp 72.800.000',
    changeLabel: '+12.5% vs last week',
    changeColor: 'success.main',
    type: 'revenue'
  },
  {
    key: 'profit-margin',
    label: 'Profit Margin',
    value: '24.3%',
    changeLabel: 'Target: 22.0%',
    changeColor: 'primary.main',
    type: 'margin'
  },
  {
    key: 'active-orders',
    label: 'Active Orders',
    value: '18',
    changeLabel: '5 in-store · 13 online',
    changeColor: 'info.main',
    type: 'orders'
  },
  {
    key: 'inventory-value',
    label: 'Inventory Value',
    value: 'Rp 215.300.000',
    changeLabel: '1.2k SKUs · 48 low stock',
    changeColor: 'warning.main',
    type: 'inventory'
  }
]

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
  { key: 'pos', label: 'POS', description: 'Open POS terminal', path: '/sales' },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Stock levels & adjustments',
    path: '/master-branch'
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Sales & performance reports',
    path: '/reports'
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    description: 'Manage supplier data',
    path: '/suppliers'
  },
  {
    key: 'users',
    label: 'Users',
    description: 'User & role management',
    path: '/master-user'
  }
]

function Home(): React.JSX.Element {
  const handleNavigate = (path: string): void => {
    window.location.hash = `#${path}`
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Box sx={{ width: '100%', p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Store Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Get an instant view of today&apos;s performance and what needs your attention.
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
