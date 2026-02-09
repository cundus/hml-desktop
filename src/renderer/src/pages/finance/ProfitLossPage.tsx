import { useEffect, useMemo, useState } from 'react'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import MoneyOffIcon from '@mui/icons-material/MoneyOff'
import PaymentsIcon from '@mui/icons-material/Payments'
import PrintIcon from '@mui/icons-material/Print'
import SavingsIcon from '@mui/icons-material/Savings'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useBranchConfig from '../../hooks/useBranchConfig'
import { formatCurrency } from '../../utils/currency'
import PeriodSelector, { type DateRange } from './components/PeriodSelector'

interface Transaction {
  id: string
  code: string
  total: string
  subtotal: string
  discount: string
  createdAt: Date
  storeId: string
  items?: TransactionItem[]
}

interface TransactionItem {
  productId: string
  quantity: number
  price: string
}

interface Product {
  id: string
  name: string
  sku: string
  cost: string
  categoryId?: string
  categoryName?: string
}

interface Expense {
  id: string
  item: string
  description: string | null
  total: string
  createdAt: Date
  storeId: string
  categoryId: string | null
}

interface Store {
  id: string
  name: string
  code: string
}

interface ProfitLossSummary {
  grossRevenue: number
  discounts: number
  netRevenue: number
  costOfGoodsSold: number
  grossProfit: number
  operatingExpenses: number
  netProfit: number
  profitMargin: number
  brokenGoods: number
}

interface CategoryBreakdown {
  category: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

export default function ProfitLossPage(): React.JSX.Element {
  const { storeId: branchStoreId } = useBranchConfig()
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Map<string, string>>(new Map())
  const [report, setReport] = useState<ProfitLossSummary | null>(null)
  const [brokenGoods,   setBrokenGoods] = useState<number>(0)

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start: firstDay, end: lastDay }
  })

  // Initial data load (stores, products, categories) - only once
  useEffect(() => {
    void loadInitialData()
  }, [branchStoreId])

  // Re-fetch transactions, expenses, and report when date/store changes
  useEffect(() => {
    if (!initialLoading) {
      void loadFilteredData()
    }
  }, [dateRange, selectedStore])

  // Load static data (stores, products, categories) - only on mount
  const loadInitialData = async (): Promise<void> => {
    try {
      setLoading(true)
      setInitialLoading(true)

      const [productsRes, categoriesRes, storesRes, expCategoriesRes] = await Promise.all([
        window.api.db.products.getAll(),
        window.api.db.categories.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.expenseCategories.getAll()
      ])

      if (storesRes.success) {
        const storeData = storesRes.data ?? []
        // For branch users, only show their store
        const availableStores = branchStoreId
          ? storeData.filter((s) => s.id === branchStoreId)
          : storeData

        setStores(availableStores)

        // Auto-select ONLY on initial load
        if (branchStoreId) {
          setSelectedStore(branchStoreId)
        } else if (availableStores.length === 1) {
          setSelectedStore(availableStores[0].id)
        }
        // If no store selected and multiple stores, leave as '' (all stores)
      }

      if (productsRes.success && categoriesRes.success) {
        const categories = categoriesRes.data ?? []
        const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
        const prods = (productsRes.data ?? []).map((p) => ({
          ...p,
          categoryName: p.categoryId ? categoryMap.get(p.categoryId) : undefined
        }))
        setProducts(prods)
      }

      if (expCategoriesRes.success && expCategoriesRes.data) {
        const map = new Map<string, string>()
        expCategoriesRes.data.forEach((c) => map.set(c.id, c.name))
        setExpenseCategories(map)
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setInitialLoading(false)
      // Trigger filtered data load after initial load
      void loadFilteredData()
    }
  }

  // Load filtered data (transactions, expenses, report) - reactive to date/store
  const loadFilteredData = async (): Promise<void> => {
    try {
      setLoading(true)

      // Determine which store to filter by
      const filterStoreId = selectedStore || branchStoreId || undefined

      const [transactionsRes, expensesRes, reportRes, brokenGoodsRes] = await Promise.all([
        window.api.db.transactions.getAll(),
        window.api.db.expenses.getAll(),
        window.api.db.transactions.getProfitLossReport(
          dateRange.start.toISOString(),
          dateRange.end.toISOString(),
          filterStoreId // Use selected store for API call
        ),
        window.api.db.transactions.getBrokenGoodsSummary(
          dateRange.start.toISOString(),
          dateRange.end.toISOString(),
          filterStoreId
        )
      ])

      console.log("Broken Goods Res", brokenGoodsRes);
      

      if (transactionsRes.success) {
        const allTxns = transactionsRes.data ?? []
        // Filter by store if specified
        setTransactions(
          filterStoreId ? allTxns.filter((t) => t.storeId === filterStoreId) : allTxns
        )
      }

      if (expensesRes.success) {
        const allExpenses = expensesRes.data ?? []
        // Filter by store if specified
        setExpenses(
          filterStoreId ? allExpenses.filter((e) => e.storeId === filterStoreId || !e.storeId) : allExpenses
        )
      }

      if (brokenGoodsRes.success) {
        setBrokenGoods(brokenGoodsRes.data ?? 0)
      }

      // Handle Report Data
      if (reportRes.success && reportRes.data) {
        const data = reportRes.data

        // Calculate expenses for the filtered store
        let opsExpenses = 0
        if (expensesRes.success) {
          const allExp = expensesRes.data ?? []
          const filteredExp = allExp.filter((e) => {
            const d = new Date(e.createdAt)
            return (
              d >= dateRange.start &&
              d <= dateRange.end &&
              (!filterStoreId || e.storeId === filterStoreId || !e.storeId)
            )
          })
          opsExpenses = filteredExp.reduce((sum, e) => sum + parseFloat(e.total), 0)
        }

          setReport({
            grossRevenue: data.revenue,
            discounts: 0,
            netRevenue: data.revenue,
            costOfGoodsSold: data.cogs,
            grossProfit: data.grossProfit,
            operatingExpenses: opsExpenses + (data.brokenGoods || 0),
            netProfit: data.grossProfit - opsExpenses - (data.brokenGoods || 0),
            profitMargin:
              data.revenue > 0 ? ((data.grossProfit - opsExpenses - (data.brokenGoods || 0)) / data.revenue) * 100 : 0,
            brokenGoods: data.brokenGoods || 0
          })
      } else {
        setReport(null)
      }
    } catch (error) {
      console.error('Failed to load filtered data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data by date range and selected store (Effectively used for Breakdown)
  const filteredData = useMemo(() => {
    const startTime = dateRange.start.getTime()
    const endTime = dateRange.end.getTime()

    let filteredTxns = transactions.filter((t) => {
      const txnTime = new Date(t.createdAt).getTime()
      return txnTime >= startTime && txnTime <= endTime
    })

    let filteredExpenses = expenses.filter((e) => {
      const expTime = new Date(e.createdAt).getTime()
      return expTime >= startTime && expTime <= endTime
    })

    // Apply store filter if selected
    if (selectedStore) {
      filteredTxns = filteredTxns.filter((t) => t.storeId === selectedStore)
      filteredExpenses = filteredExpenses.filter((e) => e.storeId === selectedStore || !e.storeId)
    }

    return { transactions: filteredTxns, expenses: filteredExpenses }
  }, [transactions, expenses, dateRange, selectedStore])

  // Create product map for quick lookup
  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]))
  }, [products])

  // Calculate P&L Summary
  const summary = useMemo((): ProfitLossSummary => {
    // If we have accurate report from API, USE IT.
    if (report) return report

    // Fallback: Client Side Calculation
    let grossRevenue = 0
    let discounts = 0
    let costOfGoodsSold = 0

    filteredData.transactions.forEach((txn) => {
      grossRevenue += parseFloat(txn.subtotal) || 0
      discounts += parseFloat(txn.discount) || 0

      // Calculate COGS from transaction items
      if (txn.items) {
        txn.items.forEach((item) => {
          const product = productMap.get(item.productId)
          if (product) {
            const unitCost = parseFloat(product.cost) || 0
            costOfGoodsSold += unitCost * item.quantity
          }
        })
      }
    })

    const netRevenue = grossRevenue - discounts
    const grossProfit = netRevenue - costOfGoodsSold
    const operatingExpenses = filteredData.expenses.reduce(
      (sum, e) => sum + (parseFloat(e.total) || 0),
      0
    ) + brokenGoods // Include broken goods in OPEX
    const netProfit = grossProfit - operatingExpenses
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0

    return {
      grossRevenue,
      discounts,
      netRevenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      netProfit,
      profitMargin,
      brokenGoods
    }
  }, [filteredData, productMap, report, brokenGoods])

  // Category breakdown
  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const categoryData = new Map<string, { revenue: number; cost: number }>()

    filteredData.transactions.forEach((txn) => {
      if (txn.items) {
        txn.items.forEach((item) => {
          const product = productMap.get(item.productId)
          if (product) {
            const category = product.categoryName || 'Lainnya'
            const existing = categoryData.get(category) || { revenue: 0, cost: 0 }
            const itemRevenue = parseFloat(item.price) * item.quantity
            const itemCost = (parseFloat(product.cost) || 0) * item.quantity

            existing.revenue += itemRevenue
            existing.cost += itemCost
            categoryData.set(category, existing)
          }
        })
      }
    })

    return Array.from(categoryData.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
  }, [filteredData, productMap])

  // Calculate Expense Breakdown by Category
  const expenseBreakdown = useMemo(() => {
    const breakdown = new Map<string, number>()

    filteredData.expenses.forEach((e) => {
      const categoryName = e.categoryId
        ? (expenseCategories.get(e.categoryId) ?? 'Lainnya')
        : 'Lainnya'
      const amount = parseFloat(e.total)
      breakdown.set(categoryName, (breakdown.get(categoryName) ?? 0) + amount)
    })

    // Add Broken Goods as an expense category
    if (brokenGoods > 0) {
      breakdown.set('Barang Rusak', (breakdown.get('Barang Rusak') ?? 0) + brokenGoods)
    }

    return Array.from(breakdown.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredData.expenses, expenseCategories])

  const handlePrint = (): void => {
    window.print()
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className="print-container">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Laporan Laba Rugi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analisis pendapatan, biaya, dan profitabilitas
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          className="no-print"
        >
          Cetak PDF
        </Button>
      </Stack>

      {/* Period Selector and Store Filter */}
      <Paper sx={{ p: 2, mb: 3 }} className="no-print">
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <PeriodSelector value={dateRange} onChange={setDateRange} />
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
        </Stack>
      </Paper>

      {/* Print Header */}
      <Box className="print-only" sx={{ mb: 3, display: 'none' }}>
        <Typography variant="h4" fontWeight={700} textAlign="center">
          Laporan Laba Rugi
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary">
          Periode: {dateRange.start.toLocaleDateString('id-ID')} -{' '}
          {dateRange.end.toLocaleDateString('id-ID')}
        </Typography>
      </Box>

      {/* Key Metrics Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                }}
              >
                <PaymentsIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pendapatan Bersih
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(summary.netRevenue)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText'
                }}
              >
                <MoneyOffIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  HPP (Cost of Goods)
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(summary.costOfGoodsSold)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{ p: 1.5, borderRadius: 2, bgcolor: 'info.light', color: 'info.contrastText' }}
              >
                <AccountBalanceIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Laba Kotor
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color={summary.grossProfit >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(summary.grossProfit)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, bgcolor: summary.netProfit >= 0 ? 'success.50' : 'error.50' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: summary.netProfit >= 0 ? 'success.main' : 'error.main',
                  color: 'white'
                }}
              >
                {summary.netProfit >= 0 ? <SavingsIcon /> : <TrendingDownIcon />}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Laba Bersih
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={summary.netProfit >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(summary.netProfit)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Margin: {summary.profitMargin.toFixed(1)}%
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* P&L Statement */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          Laporan Laba Rugi
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Table size="small">
          <TableBody>
            {/* Revenue Section */}
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 600, bgcolor: 'action.selected' }}>
                PENDAPATAN
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Pendapatan Kotor</TableCell>
              <TableCell align="right">{formatCurrency(summary.grossRevenue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4, color: 'error.main' }}>Diskon</TableCell>
              <TableCell align="right" sx={{ color: 'error.main' }}>
                ({formatCurrency(summary.discounts)})
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Pendapatan Bersih</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(summary.netRevenue)}
              </TableCell>
            </TableRow>

            {/* COGS Section */}
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 600, bgcolor: 'action.selected', pt: 3 }}>
                HARGA POKOK PENJUALAN
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ pl: 4 }}>Biaya Barang Terjual (HPP)</TableCell>
              <TableCell align="right" sx={{ color: 'error.main' }}>
                ({formatCurrency(summary.costOfGoodsSold)})
              </TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Laba Kotor</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(summary.grossProfit)}
              </TableCell>
            </TableRow>

            {/* Operating Expenses */}
            <TableRow>
              <TableCell colSpan={2} sx={{ fontWeight: 600, bgcolor: 'action.selected', pt: 3 }}>
                BEBAN OPERASIONAL
              </TableCell>
            </TableRow>
            
            {expenseBreakdown.map((cat) => (
              <TableRow key={cat.name}>
                <TableCell sx={{ pl: 4 }}>{cat.name}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  ({formatCurrency(cat.amount)})
                </TableCell>
              </TableRow>
            ))}

            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Total Beban Operasional</TableCell>
              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                ({formatCurrency(summary.operatingExpenses)})
              </TableCell>
            </TableRow>

            {/* Broken Goods / Loss - Removed as separate item, now in OPEX */
            /*
            {summary.brokenGoods > 0 && (
              <TableRow>
                <TableCell sx={{ pl: 4, color: 'error.main' }}>Barang Rusak (Loss)</TableCell>
                <TableCell align="right" sx={{ color: 'error.main' }}>
                  ({formatCurrency(summary.brokenGoods)})
                </TableCell>
              </TableRow>
            )}
            */}

            {/* Net Profit */}
            <TableRow sx={{ bgcolor: summary.netProfit >= 0 ? 'success.100' : 'error.100' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>LABA BERSIH</TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: summary.netProfit >= 0 ? 'success.main' : 'error.main'
                }}
              >
                {formatCurrency(summary.netProfit)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" mb={2}>
            Breakdown per Kategori
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Pendapatan</TableCell>
                <TableCell align="right">HPP</TableCell>
                <TableCell align="right">Laba</TableCell>
                <TableCell align="right">Margin</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categoryBreakdown.map((cat) => (
                <TableRow key={cat.category} hover>
                  <TableCell>{cat.category}</TableCell>
                  <TableCell align="right">{formatCurrency(cat.revenue)}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary' }}>
                    {formatCurrency(cat.cost)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: cat.profit >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}
                  >
                    {formatCurrency(cat.profit)}
                  </TableCell>
                  <TableCell align="right">
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        bgcolor:
                          cat.margin >= 20
                            ? 'success.100'
                            : cat.margin >= 0
                              ? 'warning.100'
                              : 'error.100',
                        color:
                          cat.margin >= 20
                            ? 'success.dark'
                            : cat.margin >= 0
                              ? 'warning.dark'
                              : 'error.dark'
                      }}
                    >
                      {cat.margin.toFixed(1)}%
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Visual Chart - Simple Profit Breakdown */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          Komposisi Laba Rugi
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Stack spacing={2}>
          {/* Revenue Bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Pendapatan Bersih</Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatCurrency(summary.netRevenue)}
              </Typography>
            </Stack>
            <Box sx={{ height: 24, borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: '100%', bgcolor: 'primary.main' }} />
            </Box>
          </Box>

          {/* COGS Bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">HPP</Typography>
              <Typography variant="body2" fontWeight={500} color="error.main">
                -{formatCurrency(summary.costOfGoodsSold)}
              </Typography>
            </Stack>
            <Box sx={{ height: 24, borderRadius: 1, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${summary.netRevenue > 0 ? (summary.costOfGoodsSold / summary.netRevenue) * 100 : 0}%`,
                  bgcolor: 'warning.main'
                }}
              />
            </Box>
          </Box>

          {/* Expenses Bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Beban Operasional</Typography>
              <Typography variant="body2" fontWeight={500} color="error.main">
                -{formatCurrency(summary.operatingExpenses)}
              </Typography>
            </Stack>
            <Box sx={{ height: 24, borderRadius: 1, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${summary.netRevenue > 0 ? (summary.operatingExpenses / summary.netRevenue) * 100 : 0}%`,
                  bgcolor: 'error.main'
                }}
              />
            </Box>
          </Box>

          {/* Net Profit Bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" fontWeight={600}>
                Laba Bersih
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                color={summary.netProfit >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(summary.netProfit)} ({summary.profitMargin.toFixed(1)}%)
              </Typography>
            </Stack>
            <Box sx={{ height: 24, borderRadius: 1, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${summary.netRevenue > 0 ? Math.abs(summary.netProfit / summary.netRevenue) * 100 : 0}%`,
                  bgcolor: summary.netProfit >= 0 ? 'success.main' : 'error.main'
                }}
              />
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </Box>
  )
}
