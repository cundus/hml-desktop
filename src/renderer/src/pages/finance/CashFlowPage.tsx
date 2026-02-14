import { useEffect, useMemo, useState } from 'react'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import PrintIcon from '@mui/icons-material/Print'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useBranchConfig from '../../hooks/useBranchConfig'
import { formatCurrency } from '../../utils/currency'
import CashFlowChart from './components/CashFlowChart'
import CashFlowTable from './components/CashFlowTable'
import PeriodSelector, { type DateRange } from './components/PeriodSelector'

interface Transaction {
  id: string
  code: string
  total: string
  createdAt: Date
  storeId: string
  paymentMethod: string
}

interface Store {
  id: string
  name: string
  code: string
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

interface CashFlowItem {
  id: string
  date: Date
  description: string
  type: 'income' | 'expense'
  category: string
  amount: number
  reference?: string
}

interface ChartDataPoint {
  date: string
  income: number
  expense: number
}

export default function CashFlowPage(): React.JSX.Element {
  const { storeId: branchStoreId } = useBranchConfig()
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [brokenGoods, setBrokenGoods] = useState<number>(0)
  const [returnTotal, setReturnTotal] = useState<number>(0)
  const [expenseCategories, setExpenseCategories] = useState<Map<string, string>>(new Map())
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    
    return { start: startOfMonth, end: endOfDay }
  })

  // Initial data load (stores, categories) - only once
  useEffect(() => {
    void loadInitialData()
  }, [branchStoreId])

  // Re-fetch transactions and expenses when date/store changes
  useEffect(() => {
    if (!initialLoading) {
      void loadFilteredData()
    }
  }, [dateRange, selectedStore])

  // Load static data (stores, categories) - only on mount
  const loadInitialData = async (): Promise<void> => {
    try {
      setLoading(true)
      setInitialLoading(true)

      const [storesRes, categoriesRes] = await Promise.all([
        window.api.db.stores.getAll(),
        window.api.db.expenseCategories.getAll()
      ])

      if (storesRes.success) {
        const storeData = storesRes.data ?? []
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
      }

      if (categoriesRes.success && categoriesRes.data) {
        const map = new Map<string, string>()
        categoriesRes.data.forEach((c) => map.set(c.id, c.name))
        setExpenseCategories(map)
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setInitialLoading(false)
      void loadFilteredData()
    }
  }

  // Load filtered data (transactions and expenses) - reactive to date/store
  const loadFilteredData = async (): Promise<void> => {
    try {
      setLoading(true)

      const filterStoreId = selectedStore || branchStoreId || undefined

      const [transactionsRes, expensesRes, brokenGoodsRes, returnSummaryRes] = await Promise.all([
        window.api.db.transactions.getByDateRange( 
          dateRange.start.toISOString(), 
          dateRange.end.toISOString(), 
          filterStoreId
        ),
        window.api.db.expenses.getAll(),
        window.api.db.transactions.getBrokenGoodsSummary(
          dateRange.start.toISOString(),
          dateRange.end.toISOString(),
          filterStoreId
        ),
        window.api.db.returns.getSummaryByDateRange(
          dateRange.start.toISOString(),
          dateRange.end.toISOString(),
          filterStoreId
        )
      ])

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data ?? [])
      }

      if (expensesRes.success) {
        const allExpenses = expensesRes.data ?? []
        // Filter expenses by store
        setExpenses(
          filterStoreId
            ? allExpenses.filter((e) => e.storeId === filterStoreId || !e.storeId)
            : allExpenses
        )
      }

      if (brokenGoodsRes.success) {
        setBrokenGoods(brokenGoodsRes.data ?? 0)
      }

      if (returnSummaryRes.success && returnSummaryRes.data) {
        setReturnTotal(returnSummaryRes.data.totalRefund ?? 0)
      } else {
        setReturnTotal(0)
      }
    } catch (error) {
      console.error('Failed to load filtered data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data by date range
  const filteredData = useMemo(() => {
    const startTime = dateRange.start.getTime()
    const endTime = dateRange.end.getTime()

    // Transactions already filtered by backend
    let filteredTxns = transactions

    // Expenses still need client-side filtering because we fetch all
    let filteredExpenses = expenses.filter((e) => {
      // 1. Filter by date
      const expTime = new Date(e.createdAt).getTime()
      if (expTime < startTime || expTime > endTime) return false

      // 2. Filter by store (if selectedStore is set)
      if (selectedStore && e.storeId && e.storeId !== selectedStore) return false

      return true
    })

    // If store selected, filter transactions again (redundant but safe)
    if (selectedStore) {
      filteredTxns = filteredTxns.filter((t) => t.storeId === selectedStore)
    }

    return { transactions: filteredTxns, expenses: filteredExpenses }
  }, [transactions, expenses, dateRange, selectedStore])

  // Calculate summaries
  const summary = useMemo(() => {
    const totalIncome = filteredData.transactions.reduce(
      (sum, t) => sum + parseFloat(t.total),
      0
    )
    let totalExpense = filteredData.expenses.reduce(
      (sum, e) => sum + parseFloat(e.total),
      0
    )

    // Add broken goods to expense
    totalExpense += brokenGoods || 0

    // Add return refunds to expense (cash outflow)
    totalExpense += returnTotal || 0

    const netCashFlow = totalIncome - totalExpense

    return { totalIncome, totalExpense, netCashFlow }
  }, [filteredData, brokenGoods, returnTotal])

  // Prepare chart data (group by date)
  const chartData = useMemo((): ChartDataPoint[] => {
    const dateMap = new Map<string, { income: number; expense: number }>()

    filteredData.transactions.forEach((t) => {
      const dateStr = new Date(t.createdAt).toISOString().split('T')[0]
      const existing = dateMap.get(dateStr) || { income: 0, expense: 0 }
      existing.income += parseFloat(t.total)
      dateMap.set(dateStr, existing)
    })

    filteredData.expenses.forEach((e) => {
      const dateStr = new Date(e.createdAt).toISOString().split('T')[0]
      const existing = dateMap.get(dateStr) || { income: 0, expense: 0 }
      existing.expense += parseFloat(e.total)
      dateMap.set(dateStr, existing)
    })

    return Array.from(dateMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredData])

  // Prepare table data
  const tableItems = useMemo((): CashFlowItem[] => {
    const incomeItems: CashFlowItem[] = filteredData.transactions.map((t) => ({
      id: t.id,
      date: new Date(t.createdAt),
      description: `Transaksi Penjualan`,
      type: 'income' as const,
      category: getPaymentMethodLabel(t.paymentMethod),
      amount: parseFloat(t.total),
      reference: t.code
    }))

    const expenseItems: CashFlowItem[] = filteredData.expenses.map((e) => ({
      id: e.id,
      date: new Date(e.createdAt),
      description: e.item + (e.description ? ` (${e.description})` : ''),
      type: 'expense' as const,
      category: e.categoryId ? (expenseCategories.get(e.categoryId) ?? 'Pengeluaran') : 'Pengeluaran',
      amount: parseFloat(e.total)
    }))

    // Add Broken Goods Virtual Item
    if (brokenGoods > 0) {
      expenseItems.push({
        id: 'broken-goods-summary',
        date: dateRange.end,
        description: 'Total Barang Rusak / Waste',
        type: 'expense' as const,
        category: 'Barang Rusak',
        amount: brokenGoods
      })
    }

    // Add Return Refunds Virtual Item
    if (returnTotal > 0) {
      expenseItems.push({
        id: 'return-refunds-summary',
        date: dateRange.end,
        description: 'Total Retur / Pengembalian',
        type: 'expense' as const,
        category: 'Retur Penjualan',
        amount: returnTotal
      })
    }

    return [...incomeItems, ...expenseItems].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [filteredData, expenseCategories, brokenGoods, returnTotal, dateRange])

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
            Laporan Arus Kas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ringkasan pemasukan dan pengeluaran berdasarkan periode
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

      {/* Print Header (only visible when printing) */}
      <Box className="print-only" sx={{ mb: 3, display: 'none' }}>
        <Typography variant="h4" fontWeight={700} textAlign="center">
          Laporan Arus Kas
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary">
          Periode: {dateRange.start.toLocaleDateString('id-ID')} -{' '}
          {dateRange.end.toLocaleDateString('id-ID')}
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'success.light',
                  color: 'success.contrastText'
                }}
              >
                <ArrowUpwardIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Pemasukan
                </Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {formatCurrency(summary.totalIncome)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredData.transactions.length} transaksi
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
                  bgcolor: 'error.light',
                  color: 'error.contrastText'
                }}
              >
                <ArrowDownwardIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Pengeluaran
                </Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {formatCurrency(summary.totalExpense)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredData.expenses.length} pengeluaran
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
                  bgcolor: summary.netCashFlow >= 0 ? 'info.light' : 'warning.light',
                  color: summary.netCashFlow >= 0 ? 'info.contrastText' : 'warning.contrastText'
                }}
              >
                {summary.netCashFlow >= 0 ? <TrendingFlatIcon /> : <AccountBalanceWalletIcon />}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Arus Kas Bersih
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={600}
                  color={summary.netCashFlow >= 0 ? 'success.main' : 'error.main'}
                >
                  {summary.netCashFlow >= 0 ? '+' : ''}
                  {formatCurrency(summary.netCashFlow)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pemasukan - Pengeluaran
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          Grafik Arus Kas
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <CashFlowChart data={chartData} />
      </Paper>

      {/* Table */}
      <Box mb={3}>
        <Typography variant="h6" mb={2}>
          Detail Transaksi
        </Typography>
        <CashFlowTable items={tableItems} />
      </Box>

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

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Tunai',
    card: 'Kartu',
    qris: 'QRIS',
    credit: 'Kredit'
  }
  return labels[method] ?? method
}
