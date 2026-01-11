import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import VisibilityIcon from '@mui/icons-material/Visibility'
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

export default function ShiftHistoryPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [shifts, setShifts] = useState<CashierShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleViewDetail = (shift: CashierShift): void => {
    navigate(`/operations/shifts/${shift.id}`)
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
                  <TableRow key={shift.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleViewDetail(shift)}>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetail(shift)
                        }}
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
    </Box>
  )
}
