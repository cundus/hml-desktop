import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
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
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PrintIcon from '@mui/icons-material/Print'
import RefreshIcon from '@mui/icons-material/Refresh'
import FilterListIcon from '@mui/icons-material/FilterList'
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
}

export default function ShiftHistoryPage(): React.JSX.Element {
  const [shifts, setShifts] = useState<CashierShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<CashierShift | null>(null)
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [filterOpen, setFilterOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: {
        fromDate?: number
        toDate?: number
      } = {}

      if (fromDate) {
        filters.fromDate = new Date(fromDate).getTime()
      }
      if (toDate) {
        // Set to end of day
        const endDate = new Date(toDate)
        endDate.setHours(23, 59, 59, 999)
        filters.toDate = endDate.getTime()
      }

      const response = await window.api.db.shifts.getAll(filters)
      if (response.success && response.data) {
        // Sort by openedAt descending (newest first)
        const sorted = [...response.data].sort(
          (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
        )
        setShifts(sorted)
      } else {
        setError(response.error || 'Gagal memuat data shift')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    void loadShifts()
  }, [loadShifts])

  const handleViewDetail = async (shift: CashierShift): Promise<void> => {
    setSelectedShift(shift)
    setDetailOpen(true)
    setDetailLoading(true)
    setShiftSummary(null)

    try {
      const response = await window.api.db.shifts.getSummary(shift.id)
      if (response.success && response.data) {
        setShiftSummary(response.data as ShiftSummary)
      }
    } catch (err) {
      console.error('Failed to load shift summary:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handlePrintReport = async (): Promise<void> => {
    if (!shiftSummary) return

    try {
      await window.api.db.printer.printSettlementReport(shiftSummary)
    } catch (err) {
      console.error('Failed to print report:', err)
    }
  }

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Riwayat Shift
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lihat semua riwayat shift kasir
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filter
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadShifts}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      {filterOpen && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="date"
              label="Dari Tanggal"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              type="date"
              label="Sampai Tanggal"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button
              variant="text"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
            >
              Reset
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        /* Shifts Table */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kasir</TableCell>
                <TableCell>Dibuka</TableCell>
                <TableCell>Ditutup</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Kas Awal</TableCell>
                <TableCell align="right">Kas Akhir</TableCell>
                <TableCell align="right">Selisih</TableCell>
                <TableCell align="center">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Tidak ada data shift</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{shift.userName || shift.userId}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(shift.openedAt)}</TableCell>
                    <TableCell>
                      {shift.closedAt ? formatDate(shift.closedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={shift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                        color={shift.status === 'OPEN' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(parseFloat(shift.initialCash))}</TableCell>
                    <TableCell align="right">
                      {shift.closingCash ? formatCurrency(parseFloat(shift.closingCash)) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {shift.difference ? (
                        <Chip
                          label={formatCurrency(parseFloat(shift.difference))}
                          color={getDifferenceColor(shift.difference)}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetail(shift)}
                        title="Lihat Detail"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Detail Shift</Typography>
            {selectedShift && (
              <Chip
                label={selectedShift.status === 'OPEN' ? 'Aktif' : 'Ditutup'}
                color={selectedShift.status === 'OPEN' ? 'success' : 'default'}
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedShift && shiftSummary ? (
            <Stack spacing={2}>
              {/* Cashier Info */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Kasir
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedShift.userName || selectedShift.userId}
                </Typography>
              </Box>

              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Dibuka
                  </Typography>
                  <Typography variant="body2">{formatDate(selectedShift.openedAt)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ditutup
                  </Typography>
                  <Typography variant="body2">
                    {selectedShift.closedAt ? formatDate(selectedShift.closedAt) : '-'}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              {/* Stats */}
              <Stack direction="row" spacing={2}>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {shiftSummary.transactionCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Transaksi
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {shiftSummary.expenseCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pengeluaran
                  </Typography>
                </Paper>
              </Stack>

              <Divider />

              {/* Cash Flow */}
              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Arus Kas
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Kas Awal</Typography>
                    <Typography variant="body2">{formatCurrency(parseFloat(selectedShift.initialCash))}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Penjualan Bersih</Typography>
                    <Typography variant="body2" color="success.main">
                      +{formatCurrency(parseFloat(shiftSummary.netSales))}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Total Pengeluaran</Typography>
                    <Typography variant="body2" color="error.main">
                      -{formatCurrency(parseFloat(shiftSummary.totalExpenses || '0'))}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold">
                      Kas Diharapkan
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(parseFloat(shiftSummary.expectedCash))}
                    </Typography>
                  </Stack>
                  {selectedShift.closingCash && (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Kas Akhir</Typography>
                        <Typography variant="body2">
                          {formatCurrency(parseFloat(selectedShift.closingCash))}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="bold">
                          Selisih
                        </Typography>
                        <Chip
                          label={formatCurrency(parseFloat(selectedShift.difference || '0'))}
                          color={getDifferenceColor(selectedShift.difference)}
                          size="small"
                        />
                      </Stack>
                    </>
                  )}
                </Stack>
              </Box>

              {/* Notes */}
              {selectedShift.notes && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Catatan
                    </Typography>
                    <Typography variant="body2">{selectedShift.notes}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary" align="center" py={2}>
              Tidak dapat memuat detail shift
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {shiftSummary && selectedShift?.status === 'CLOSED' && (
            <Button startIcon={<PrintIcon />} onClick={handlePrintReport}>
              Cetak Laporan
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
