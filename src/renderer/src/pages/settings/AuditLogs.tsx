import { useEffect, useMemo, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import HistoryIcon from '@mui/icons-material/History'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FilterListIcon from '@mui/icons-material/FilterList'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useAuth from '../../hooks/useAuth'

interface AuditLogRecord {
  id: string
  action: string
  entityType: string
  entityId: string | null
  userId: string
  userName: string | null
  storeId: string | null
  storeName: string | null
  deviceId: string | null
  oldValues: object | null
  newValues: object | null
  metadata: object | null
  createdAt: Date
}

interface Store {
  id: string
  name: string
}

interface User {
  id: string
  name: string
}

// Action labels for display
const actionLabels: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  CREATE: { label: 'Buat', color: 'success' },
  UPDATE: { label: 'Ubah', color: 'warning' },
  DELETE: { label: 'Hapus', color: 'error' },
  LOGIN: { label: 'Login', color: 'info' },
  LOGOUT: { label: 'Logout', color: 'default' },
  IMPORT: { label: 'Import', color: 'info' },
  EXPORT: { label: 'Export', color: 'info' },
  TOGGLE_ACTIVE: { label: 'Toggle Status', color: 'warning' },
  PRICE_CHANGE: { label: 'Ubah Harga', color: 'warning' },
  STOCK_ADJUSTMENT: { label: 'Penyesuaian Stok', color: 'warning' },
  SHIFT_OPEN: { label: 'Buka Shift', color: 'success' },
  SHIFT_CLOSE: { label: 'Tutup Shift', color: 'error' },
  PAYMENT: { label: 'Pembayaran', color: 'success' },
  REFUND: { label: 'Refund', color: 'warning' },
  VOID: { label: 'Void', color: 'error' }
}

// Entity type labels
const entityLabels: Record<string, string> = {
  product: 'Produk',
  category: 'Kategori',
  supplier: 'Supplier',
  customer: 'Pelanggan',
  transaction: 'Transaksi',
  expense: 'Pengeluaran',
  user: 'User',
  role: 'Role',
  store: 'Toko',
  shift: 'Shift',
  stock: 'Stok',
  price: 'Harga',
  batch: 'Batch',
  purchase_order: 'PO',
  delivery_order: 'Surat Jalan',
  payment_method: 'Metode Pembayaran',
  permission: 'Permission',
  config: 'Konfigurasi',
  system: 'Sistem'
}

export default function AuditLogs(): React.JSX.Element {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterEntityType, setFilterEntityType] = useState<string>('')
  const [filterUserId, setFilterUserId] = useState<string>('')
  const [filterStoreId, setFilterStoreId] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const debouncedStartDate = useDebounce(filterStartDate, 1000)
  const debouncedEndDate = useDebounce(filterEndDate, 1000)

  // Expanded row for details
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Sync chronology after debounce
  useEffect(() => {
    if (debouncedStartDate && debouncedEndDate && debouncedStartDate > debouncedEndDate) {
      setFilterEndDate(debouncedStartDate)
    }
  }, [debouncedStartDate])

  useEffect(() => {
    if (debouncedStartDate && debouncedEndDate && debouncedEndDate < debouncedStartDate) {
      setFilterStartDate(debouncedEndDate)
    }
  }, [debouncedEndDate])

  const canView = hasPermission('audit.view')

  // Build filters object
  const filters = useMemo(
    () => ({
      action: filterAction || undefined,
      entityType: filterEntityType || undefined,
      userId: filterUserId || undefined,
      storeId: filterStoreId || undefined,
      startDate: debouncedStartDate || undefined,
      endDate: debouncedEndDate || undefined,
      limit: rowsPerPage,
      offset: page * rowsPerPage
    }),
    [
      filterAction,
      filterEntityType,
      filterUserId,
      filterStoreId,
      debouncedStartDate,
      debouncedEndDate,
      page,
      rowsPerPage
    ]
  )

  useEffect(() => {
    if (canView) {
      void loadData()
      void loadFiltersData()
    }
  }, [canView])

  useEffect(() => {
    if (canView) {
      void loadLogs()
    }
  }, [filters, canView])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    await loadLogs()
    setLoading(false)
  }

  const loadFiltersData = async (): Promise<void> => {
    const [storesRes, usersRes] = await Promise.all([
      window.api.db.stores.getAll(),
      window.api.db.users.getAll()
    ])
    if (storesRes.success) setStores(storesRes.data ?? [])
    if (usersRes.success) setUsers(usersRes.data ?? [])
  }



  const loadLogs = async (): Promise<void> => {
    const [logsRes, countRes] = await Promise.all([
      window.api.db.audit.getAll(filters),
      window.api.db.audit.getCount({
        action: filters.action,
        entityType: filters.entityType,
        userId: filters.userId,
        storeId: filters.storeId,
        startDate: filters.startDate,
        endDate: filters.endDate
      })
    ])
    if (logsRes.success) setLogs(logsRes.data ?? [])
    if (countRes.success) setTotalCount(countRes.data ?? 0)
  }

  const handleChangePage = (_: unknown, newPage: number): void => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const resetFilters = (): void => {
    setFilterAction('')
    setFilterEntityType('')
    setFilterUserId('')
    setFilterStoreId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(0)
  }

  const formatDate = (date: Date): string => {
    const dateValue = new Date(date)
    if (isNaN(dateValue.getTime())) return '-'
    return dateValue.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const renderJsonDiff = (
    oldValues: object | null,
    newValues: object | null
  ): React.JSX.Element => {
    if (!oldValues && !newValues) {
      return (
        <Typography color="text.secondary" fontSize="small">
          Tidak ada detail
        </Typography>
      )
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {oldValues && (
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Data Lama:
            </Typography>
            <Paper sx={{ p: 1, bgcolor: 'error.50', maxHeight: 200, overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(oldValues, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}
        {newValues && (
          <Box sx={{ flex: 1, minWidth: 250 }}>
            <Typography variant="subtitle2" color="success.main" gutterBottom>
              Data Baru:
            </Typography>
            <Paper sx={{ p: 1, bgcolor: 'success.50', maxHeight: 200, overflow: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(newValues, null, 2)}
              </pre>
            </Paper>
          </Box>
        )}
      </Box>
    )
  }

  if (!canView) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">Anda tidak memiliki akses untuk melihat audit log</Typography>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HistoryIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Audit Log
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Riwayat aktivitas dan perubahan data sistem
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
        </Button>
      </Stack>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Filter
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                select
                label="Aksi"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
              >
                <MenuItem value="">Semua</MenuItem>
                {Object.entries(actionLabels).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Entity"
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
              >
                <MenuItem value="">Semua</MenuItem>
                {Object.entries(entityLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="User"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
              >
                <MenuItem value="">Semua User</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Toko"
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
              >
                <MenuItem value="">Semua Toko</MenuItem>
                {stores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="date"
                label="Dari Tanggal"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                type="date"
                label="Sampai Tanggal"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <Button variant="text" onClick={resetFilters}>
                Reset
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      {/* Summary */}
      <Typography variant="body2" color="text.secondary" mb={2}>
        Total: {totalCount.toLocaleString()} log
      </Typography>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Waktu</TableCell>
              <TableCell>Aksi</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell>ID Entity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={4}>
                    Tidak ada data audit log
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <>
                  <TableRow
                    key={log.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        <ExpandMoreIcon
                          sx={{
                            transform: expandedRow === log.id ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={actionLabels[log.action]?.label || log.action}
                        color={actionLabels[log.action]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{entityLabels[log.entityType] || log.entityType}</TableCell>
                    <TableCell>{log.userName || log.userId}</TableCell>
                    <TableCell>{stores.find((s) => s.id === log.storeId)?.name || '-'}</TableCell>
                    <TableCell>
                      <Typography fontSize="small" fontFamily="monospace">
                        {log.entityId?.substring(0, 8) || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={7} sx={{ py: 0 }}>
                      <Collapse in={expandedRow === log.id}>
                        <Box sx={{ p: 2 }}>
                          <Stack direction="row" spacing={4} mb={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Device ID
                              </Typography>
                              <Typography fontSize="small" fontFamily="monospace">
                                {log.deviceId || '-'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Entity ID (Full)
                              </Typography>
                              <Typography fontSize="small" fontFamily="monospace">
                                {log.entityId || '-'}
                              </Typography>
                            </Box>
                          </Stack>
                          {renderJsonDiff(log.oldValues, log.newValues)}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Baris per halaman:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} dari ${count}`}
      />
    </Box>
  )
}
