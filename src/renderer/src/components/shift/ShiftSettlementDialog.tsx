import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'

interface ShiftSummary {
  shift: {
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
  transactionCount: number
  totalSales: string
  totalDiscount: string
  totalTax: string
  netSales: string
  expectedCash: string
  transactions: {
    id: string
    code: string
    total: string
    createdAt: Date
    customerName?: string
  }[]
}

interface ShiftSettlementDialogProps {
  open: boolean
  shiftId: string | null
  onClose: () => void
  onProceedToClose: () => void
}

export default function ShiftSettlementDialog({
  open,
  shiftId,
  onClose,
  onProceedToClose
}: ShiftSettlementDialogProps): React.JSX.Element {
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async (): Promise<void> => {
      if (!shiftId) return

      try {
        setLoading(true)
        setError(null)
        const response = await window.api.db.shifts.getSummary(shiftId)
        if (response.success && response.data) {
          setSummary(response.data)
        } else {
          setError(response.error ?? 'Gagal memuat ringkasan shift')
        }
      } catch (err) {
        setError((err as Error).message || 'Gagal memuat ringkasan shift')
      } finally {
        setLoading(false)
      }
    }

    if (open && shiftId) {
      loadSummary()
    }
  }, [open, shiftId])

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return (num || 0).toLocaleString('id-ID')
  }

  const formatDateTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClose = (): void => {
    setSummary(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Ringkasan Shift (Settlement)
          {summary && (
            <Chip
              label={summary.shift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
              color={summary.shift.status === 'OPEN' ? 'success' : 'default'}
              size="small"
            />
          )}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : summary ? (
          <Box>
            {/* Shift Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Informasi Shift
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                  p: 2,
                  borderRadius: 1
                }}
              >
                <Box>
                  <Typography variant="caption">Kasir</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {summary.shift.userName ?? '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Waktu Buka</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDateTime(summary.shift.openedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Financial Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Ringkasan Keuangan
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2
                }}
              >
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Kas Awal
                  </Typography>
                  <Typography variant="h6">
                    Rp {formatCurrency(summary.shift.initialCash)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Penjualan
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    Rp {formatCurrency(summary.totalSales)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Diskon
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    - Rp {formatCurrency(summary.totalDiscount)}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Pajak
                  </Typography>
                  <Typography variant="h6">Rp {formatCurrency(summary.totalTax)}</Typography>
                </Paper>
              </Box>

              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 2, bgcolor: 'primary.50', borderColor: 'primary.main' }}
              >
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Penjualan Bersih
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight={600}>
                      Rp {formatCurrency(summary.netSales)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      Kas yang Diharapkan
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      Rp {formatCurrency(summary.expectedCash)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Transactions List */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Daftar Transaksi ({summary.transactionCount} transaksi)
              </Typography>
              {summary.transactions.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Tidak ada transaksi selama shift ini
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Kode</TableCell>
                        <TableCell>Waktu</TableCell>
                        <TableCell>Pelanggan</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.transactions.map((tx) => (
                        <TableRow key={tx.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {tx.code}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatTime(tx.createdAt)}</TableCell>
                          <TableCell>{tx.customerName ?? '-'}</TableCell>
                          <TableCell align="right">Rp {formatCurrency(tx.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        ) : (
          <Alert severity="info">Tidak ada data shift</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Tutup</Button>
        {summary && summary.shift.status === 'OPEN' && (
          <Button variant="contained" color="warning" onClick={onProceedToClose}>
            Lanjut Tutup Shift
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
