import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ReceiptIcon from '@mui/icons-material/Receipt'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useBranchConfig from '../../hooks/useBranchConfig'
import Kbd from '../../components/Kbd'
import { formatCurrency } from '../../utils/currency'

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
  subtotal: string
  total: string
  discount: string
  tax: string
  paymentMethod: string
  createdAt: Date
  customerId: string | null
  customerName?: string
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
  const navigate = useNavigate()
  const { storeId: branchStoreId } = useBranchConfig()
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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const tableRef = useRef<HTMLTableElement>(null)

  useEffect(() => {
    loadData()
  }, [branchStoreId])

  // Reset selection when filtered transactions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [filteredTransactions.length])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
        return

      if (filteredTransactions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredTransactions.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        const txn = filteredTransactions[selectedIndex]
        if (txn) {
          navigate(`/sales/transaction/${txn.id}`)
        }
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1)
      }
    },
    [filteredTransactions, selectedIndex, navigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex >= 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tbody tr')
      if (rows[selectedIndex]) {
        rows[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  useEffect(() => {
    applyFilters()
  }, [transactions, selectedStore, startDate, endDate])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [transactionsRes, storesRes, customersRes] = await Promise.all([
        window.api.db.transactions.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.customers.getAll()
      ])

      if (transactionsRes.success && storesRes.success) {
        const storesMap = new Map(storesRes.data?.map((s) => [s.id, s.name]))
        const customersMap = new Map((customersRes.data ?? []).map((c) => [c.id, c.name]))

        // Filter transactions by branch store if not HQ
        const allTransactions = transactionsRes.data ?? []
        const filteredByBranch = branchStoreId
          ? allTransactions.filter((txn) => txn.storeId === branchStoreId)
          : allTransactions

        const enrichedTransactions = filteredByBranch.map((txn) => ({
          ...txn,
          storeName: storesMap.get(txn.storeId),
          customerName: txn.customerId ? customersMap.get(txn.customerId) : undefined
        }))

        setTransactions(enrichedTransactions)
        // For branch users, only show their store in dropdown
        setStores(
          branchStoreId
            ? (storesRes.data ?? []).filter((s) => s.id === branchStoreId)
            : (storesRes.data ?? [])
        )
      } else {
        setError('Gagal memuat data')
      }
    } catch {
      setError('Gagal memuat data')
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
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight="600">
          Laporan Transaksi
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Stack direction="row" spacing={3} mb={3} sx={{ flexWrap: 'wrap', gap: 3 }}>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ReceiptIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4">{summary.totalTransactions}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Transaksi
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
                <Typography variant="h4">{formatCurrency(Number(summary.totalRevenue))}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Pendapatan
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
                <Typography variant="h4">{formatCurrency(Number(summary.totalDiscount))}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Diskon
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
                <Typography variant="h4">{formatCurrency(Number(summary.totalTax))}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Pajak
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
            label="Toko"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Semua Toko</MenuItem>
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Tanggal Akhir"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 200 }}
          />

          <Button variant="outlined" onClick={clearFilters}>
            Hapus Filter
          </Button>
        </Stack>
      </Paper>

      {/* Transactions Table */}
      <Paper>
        <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Navigasi:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Kbd keys={['↑']} size="small" />
              <Kbd keys={['↓']} size="small" />
              <Typography variant="body2">Pilih</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Kbd keys={['Enter']} size="small" />
              <Typography variant="body2">Buka Detail</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Kbd keys={['Esc']} size="small" />
              <Typography variant="body2">Batal Pilih</Typography>
            </Box>
          </Stack>
        </Box>
        <Table ref={tableRef}>
          <TableHead>
            <TableRow>
              <TableCell>Tanggal/Waktu</TableCell>
              <TableCell>Kode Transaksi</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell>Pelanggan</TableCell>
              <TableCell>Pembayaran</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right">Diskon</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((txn, index) => (
              <TableRow
                key={txn.id}
                hover
                selected={index === selectedIndex}
                sx={{
                  cursor: 'pointer',
                  backgroundColor:
                    index === selectedIndex ? 'action.selected' : 'inherit',
                  '&:hover': {
                    backgroundColor:
                      index === selectedIndex ? 'action.selected' : 'action.hover'
                  }
                }}
                onClick={() => {
                  setSelectedIndex(index)
                  navigate(`/sales/transaction/${txn.id}`)
                }}
              >
                <TableCell>{formatDate(txn.createdAt)}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {txn.code}
                  </Typography>
                </TableCell>
                <TableCell>{txn.storeName || txn.storeId}</TableCell>
                <TableCell>{txn.customerName || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={getPaymentMethodLabel(txn.paymentMethod)}
                    size="small"
                    color={txn.paymentMethod === 'credit' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(Number(txn.subtotal) || 0)}
                </TableCell>
                <TableCell align="right">
                  {Number(txn.discount) > 0 && (
                    <Typography variant="body2" color="error">
                      -{formatCurrency(Number(txn.discount))}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {formatCurrency(Number(txn.total))}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Lihat Detail">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/sales/transaction/${txn.id}`)
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Tidak ada transaksi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
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
