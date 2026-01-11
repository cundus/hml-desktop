import type React from 'react'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintIcon from '@mui/icons-material/Print'
import { formatCurrency } from '@renderer/utils/currency'

interface CashierShift {
  id: string
  userId: string
  storeId: string
  status: 'OPEN' | 'CLOSED'
  initialCash: string
  closingCash: string | null
  expectedCash: string | null
  difference: string | null
  notes: string | null
  openedAt: Date
  closedAt: Date | null
  userName?: string
}

interface Transaction {
  id: string
  code: string
  total: string
  discount: string
  paymentMethod: string
  createdAt: Date
  customerName?: string
}

interface Expense {
  id: string
  item: string
  quantity: number
  price: string
  total: string
  description?: string
  createdAt: Date
}

interface ShiftSummary {
  shift: CashierShift
  transactionCount: number
  expenseCount: number
  totalSales: string
  totalDiscount: string
  totalTax: string
  netSales: string
  expectedCash: string
  totalExpenses: string
  paymentMethodStats: Record<string, string>
  transactions: Transaction[]
  expenses: Expense[]
}

export default function ShiftDetailPage(): React.JSX.Element {
  const { shiftId } = useParams<{ shiftId: string }>()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shiftId) return

    const loadShiftDetail = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        // Load shift summary (includes transactions and expenses)
        const summaryRes = await window.api.db.shifts.getSummary(shiftId)
        if (summaryRes.success && summaryRes.data) {
          setSummary(summaryRes.data as ShiftSummary)
        } else {
          setError(summaryRes.error || 'Gagal memuat data shift')
        }
      } catch (err) {
        console.error('Failed to load shift detail:', err)
        setError('Terjadi kesalahan saat memuat data')
      } finally {
        setLoading(false)
      }
    }

    void loadShiftDetail()
  }, [shiftId])

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date: Date | string): string => {
    return new Date(date).toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDifferenceColor = (diff: string | null): 'success' | 'error' | 'default' => {
    if (!diff) return 'default'
    const value = parseFloat(diff)
    if (value > 0) return 'success'
    if (value < 0) return 'error'
    return 'default'
  }

  const handlePrintReport = async (): Promise<void> => {
    if (!summary) return
    try {
      await window.api.db.printer.printSettlementReport(summary)
    } catch (err) {
      console.error('Failed to print report:', err)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Kembali
        </Button>
        <Alert severity="error">{error || 'Data shift tidak ditemukan'}</Alert>
      </Box>
    )
  }

  const shift = summary.shift
  const transactions = summary.transactions || []
  const expenses = summary.expenses || []

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Detail Shift
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {shift.userName || shift.userId} • {formatDate(shift.openedAt)}
            </Typography>
          </Box>
          <Chip
            label={shift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
            color={shift.status === 'OPEN' ? 'success' : 'default'}
            size="small"
          />
        </Stack>
        {shift.status === 'CLOSED' && (
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReport}>
            Cetak Laporan
          </Button>
        )}
      </Stack>

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Waktu Buka</Typography>
          <Typography variant="h6">{formatDate(shift.openedAt)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Waktu Tutup</Typography>
          <Typography variant="h6">{shift.closedAt ? formatDate(shift.closedAt) : '-'}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            {summary.transactionCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">Transaksi</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="bold" color="warning.main">
            {summary.expenseCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">Pengeluaran</Typography>
        </Paper>
      </Stack>

      {/* Cash Flow Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Ringkasan Arus Kas
        </Typography>
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="body2" color="text.secondary">Kas Awal</Typography>
            <Typography variant="h6">{formatCurrency(parseFloat(shift.initialCash))}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Penjualan Bersih</Typography>
            <Typography variant="h6" color="success.main">
              +{formatCurrency(parseFloat(summary.netSales))}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Pengeluaran</Typography>
            <Typography variant="h6" color="error.main">
              -{formatCurrency(parseFloat(summary.totalExpenses || '0'))}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Kas Diharapkan</Typography>
            <Typography variant="h6" fontWeight="bold">
              {formatCurrency(parseFloat(summary.expectedCash))}
            </Typography>
          </Box>
          {shift.closingCash && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">Kas Akhir</Typography>
                <Typography variant="h6">{formatCurrency(parseFloat(shift.closingCash))}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Selisih</Typography>
                <Chip
                  label={formatCurrency(parseFloat(shift.difference || '0'))}
                  color={getDifferenceColor(shift.difference)}
                  size="small"
                />
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      {/* Transactions Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Daftar Transaksi ({transactions.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>No. Nota</TableCell>
                <TableCell>Waktu</TableCell>
                <TableCell align="right">Total Belanja</TableCell>
                <TableCell align="right">Diskon</TableCell>
                <TableCell>Metode Pembayaran</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">Tidak ada transaksi</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{tx.code}</Typography>
                    </TableCell>
                    <TableCell>{formatTime(tx.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {formatCurrency(parseFloat(tx.total))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {tx.discount && parseFloat(tx.discount) > 0
                        ? formatCurrency(parseFloat(tx.discount))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          !tx.paymentMethod || tx.paymentMethod === 'cash' 
                            ? 'Tunai' 
                            : tx.paymentMethod === 'credit' 
                              ? 'Kredit' 
                              : tx.paymentMethod
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Expenses Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Daftar Pengeluaran ({expenses.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Waktu</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Harga</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Keterangan</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">Tidak ada pengeluaran</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{exp.item}</Typography>
                    </TableCell>
                    <TableCell>{formatTime(exp.createdAt)}</TableCell>
                    <TableCell align="center">{exp.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(parseFloat(exp.price))}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium" color="error.main">
                        {formatCurrency(parseFloat(exp.total))}
                      </Typography>
                    </TableCell>
                    <TableCell>{exp.description || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Notes */}
      {shift.notes && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">Catatan</Typography>
          <Typography variant="body1">{shift.notes}</Typography>
        </Paper>
      )}
    </Box>
  )
}
