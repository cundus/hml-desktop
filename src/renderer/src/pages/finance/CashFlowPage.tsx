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
  description: string
  total: string
  createdAt: Date
  storeId: string
  categoryName?: string
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
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)
    return { start: today, end: endOfDay }
  })

  useEffect(() => {
    void loadData()
  }, [branchStoreId])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)

      const [transactionsRes, expensesRes, storesRes] = await Promise.all([
        window.api.db.transactions.getAll(),
        window.api.db.expenses.getAll(),
        window.api.db.stores.getAll()
      ])

      if (storesRes.success) {
        // For branch users, only show their store
        setStores(
          branchStoreId
            ? (storesRes.data ?? []).filter((s) => s.id === branchStoreId)
            : (storesRes.data ?? [])
        )
      }

      if (transactionsRes.success) {
        const allTxns = transactionsRes.data ?? []
        // Filter by branch if applicable
        setTransactions(
          branchStoreId ? allTxns.filter((t) => t.storeId === branchStoreId) : allTxns
        )
      }

      if (expensesRes.success) {
        const allExpenses = expensesRes.data ?? []
        setExpenses(
          branchStoreId ? allExpenses.filter((e) => e.storeId === branchStoreId) : allExpenses
        )
      }
    } catch (error) {
      console.error('Failed to load cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data by date range and selected store
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
      filteredExpenses = filteredExpenses.filter((e) => e.storeId === selectedStore)
    }

    return { transactions: filteredTxns, expenses: filteredExpenses }
  }, [transactions, expenses, dateRange, selectedStore])

  // Calculate summaries
  const summary = useMemo(() => {
    const totalIncome = filteredData.transactions.reduce(
      (sum, t) => sum + parseFloat(t.total),
      0
    )
    const totalExpense = filteredData.expenses.reduce(
      (sum, e) => sum + parseFloat(e.total),
      0
    )
    const netCashFlow = totalIncome - totalExpense

    return { totalIncome, totalExpense, netCashFlow }
  }, [filteredData])

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
      description: e.description,
      type: 'expense' as const,
      category: e.categoryName ?? 'Pengeluaran',
      amount: parseFloat(e.total)
    }))

    return [...incomeItems, ...expenseItems]
  }, [filteredData])

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
