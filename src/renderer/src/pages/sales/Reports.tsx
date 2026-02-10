import { useEffect, useState } from 'react'
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
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import useBranchConfig from '../../hooks/useBranchConfig'
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

  useEffect(() => {
    loadData()
  }, [branchStoreId])

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
                <Typography variant="h4">
                  {formatCurrency(Number(summary.totalDiscount))}
                </Typography>
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

      {/* Transactions DataGrid */}
      <Paper sx={{ height: 500 }}>
        <DataGrid
          rows={filteredTransactions}
          columns={
            [
              {
                field: 'createdAt',
                headerName: 'Tanggal/Waktu',
                width: 160,
                valueFormatter: (value: Date) => formatDate(value)
              },
              {
                field: 'code',
                headerName: 'Kode Transaksi',
                width: 140,
                renderCell: (params: GridRenderCellParams<Transaction>) => params.value
              },
              {
                field: 'storeName',
                headerName: 'Toko',
                width: 150,
                valueGetter: (_value, row) => row.storeName || row.storeId
              },
              {
                field: 'customerName',
                headerName: 'Pelanggan',
                width: 150,
                valueGetter: (_value, row) => row.customerName || '-'
              },
              {
                field: 'paymentMethod',
                headerName: 'Pembayaran',
                width: 120,
                renderCell: (params: GridRenderCellParams<Transaction>) => (
                  <Chip
                    label={getPaymentMethodLabel(params.value as string)}
                    size="small"
                    color={params.value === 'credit' ? 'warning' : 'default'}
                    variant="outlined"
                  />
                )
              },
              {
                field: 'subtotal',
                headerName: 'Subtotal',
                width: 130,
                align: 'right',
                headerAlign: 'right',
                valueFormatter: (value: string) => formatCurrency(Number(value) || 0)
              },
              {
                field: 'discount',
                headerName: 'Diskon',
                width: 120,
                align: 'right',
                headerAlign: 'right',
                renderCell: (params: GridRenderCellParams<Transaction>) => {
                  const discount = Number(params.value) || 0
                  return discount > 0 ? (
                    <Typography variant="body2" color="error">
                      -{formatCurrency(discount)}
                    </Typography>
                  ) : null
                }
              },
              {
                field: 'total',
                headerName: 'Total',
                width: 130,
                align: 'right',
                headerAlign: 'right',
                renderCell: (params: GridRenderCellParams<Transaction>) =>
                  formatCurrency(Number(params.value) || 0)
              },
              {
                field: 'actions',
                headerName: 'Aksi',
                width: 80,
                sortable: false,
                filterable: false,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params: GridRenderCellParams<Transaction>) => (
                  <Tooltip title="Lihat Detail">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/sales/transaction/${params.row.id}`)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }
            ] as GridColDef[]
          }
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] }
          }}
          onRowClick={(params) => navigate(`/sales/transaction/${params.row.id}`)}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
            '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
            '& .MuiDataGrid-row': { cursor: 'pointer' }
          }}
        />
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
