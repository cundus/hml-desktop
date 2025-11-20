import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ReceiptIcon from '@mui/icons-material/Receipt'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import DownloadIcon from '@mui/icons-material/Download'

interface Store {
  id: string
  name: string
  code: string
}

interface Transaction {
  id: string
  code: string
  storeId: string
  storeName?: string
  total: string
  discount: string
  tax: string
  createdAt: Date
  customerId: string | null
  items?: Array<{
    productId: string
    quantity: number
    price: string
  }>
}

interface SalesSummary {
  totalTransactions: number
  totalRevenue: string
  totalDiscount: string
  totalTax: string
}

export default function SalesReportsPage(): React.JSX.Element {
  const [stores, setStores] = useState<Store[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<SalesSummary>({
    totalTransactions: 0,
    totalRevenue: '0',
    totalDiscount: '0',
    totalTax: '0'
  })
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transactions, selectedStore, startDate, endDate])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [transactionsRes, storesRes] = await Promise.all([
        window.api.db.transactions.getAll(),
        window.api.db.stores.getAll()
      ])

      if (transactionsRes.success && storesRes.success) {
        const storesMap = new Map(storesRes.data?.map((s) => [s.id, s.name]))
        
        const enrichedTransactions = (transactionsRes.data ?? []).map((txn) => ({
          ...txn,
          storeName: storesMap.get(txn.storeId)
        }))

        setTransactions(enrichedTransactions)
        setStores(storesRes.data ?? [])
      } else {
        setError('Failed to load data')
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (): void => {
    let filtered = [...transactions]

    if (selectedStore) {
      filtered = filtered.filter((txn) => txn.storeId === selectedStore)
    }

    if (startDate) {
      const start = new Date(startDate).getTime()
      filtered = filtered.filter((txn) => new Date(txn.createdAt).getTime() >= start)
    }

    if (endDate) {
      const end = new Date(endDate).getTime()
      filtered = filtered.filter((txn) => new Date(txn.createdAt).getTime() <= end)
    }

    setFilteredTransactions(filtered)
    calculateSummary(filtered)
  }

  const calculateSummary = (txns: Transaction[]): void => {
    const totalRevenue = txns.reduce((sum, txn) => sum + parseFloat(txn.total), 0)
    const totalDiscount = txns.reduce((sum, txn) => sum + parseFloat(txn.discount), 0)
    const totalTax = txns.reduce((sum, txn) => sum + parseFloat(txn.tax), 0)

    setSummary({
      totalTransactions: txns.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalTax: totalTax.toFixed(2)
    })
  }

  const clearFilters = (): void => {
    setSelectedStore('')
    setStartDate('')
    setEndDate('')
  }

  const exportToCSV = (): void => {
    const headers = ['Date', 'Transaction Code', 'Store', 'Total', 'Discount', 'Tax', 'Net Total']
    const rows = filteredTransactions.map((txn) => [
      new Date(txn.createdAt).toLocaleString(),
      txn.code,
      txn.storeName || txn.storeId,
      txn.total,
      txn.discount,
      txn.tax,
      (parseFloat(txn.total) - parseFloat(txn.discount) + parseFloat(txn.tax)).toFixed(2)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-report-${Date.now()}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString()
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales Reports</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          disabled={filteredTransactions.length === 0}
        >
          Export CSV
        </Button>
      </Stack>

      {/* Summary Cards */}
      <Stack direction="row" spacing={3} mb={3} sx={{ flexWrap: 'wrap', gap: 3 }}>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ReceiptIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{summary.totalTransactions}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Transactions
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AttachMoneyIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">${summary.totalRevenue}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">${summary.totalDiscount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Discounts
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AttachMoneyIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">${summary.totalTax}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Tax
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          Filters
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select
            label="Store"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Stores</MenuItem>
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <Button variant="outlined" onClick={clearFilters}>
            Clear Filters
          </Button>
        </Stack>
      </Paper>

      {/* Transactions Table */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date/Time</TableCell>
              <TableCell>Transaction Code</TableCell>
              <TableCell>Store</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell>{formatDate(txn.createdAt)}</TableCell>
                <TableCell>{txn.code}</TableCell>
                <TableCell>{txn.storeName || txn.storeId}</TableCell>
                <TableCell align="right">
                  ${(parseFloat(txn.total) - parseFloat(txn.tax) + parseFloat(txn.discount)).toFixed(2)}
                </TableCell>
                <TableCell align="right">${txn.discount}</TableCell>
                <TableCell align="right">${txn.tax}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">${txn.total}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
