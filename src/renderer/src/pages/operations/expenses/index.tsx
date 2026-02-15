import {
  Add as AddIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Fab,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme
} from '@mui/material'
import { useShift } from '@renderer/hooks/useShift'
import useAuth from '@renderer/hooks/useAuth'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { formatCurrency } from '../../../utils/currency'
import Kbd from '../../../components/Kbd'
import { ExpenseForm, type ExpenseFormData } from '../../sales/components/ExpenseForm'
import { ExpenseList } from '../../sales/components/ExpenseList'

// Define Expense type locally to avoid import issues
interface Expense {
  id: string
  shiftId: string
  item: string
  quantity: number
  price: string
  total: string
  description: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export default function ExpensesPage(): React.JSX.Element {
  const { currentShift } = useShift()
  const { hasPermission } = useAuth()
  const theme = useTheme()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })

  // Load expenses for current shift
  const loadExpenses = useCallback(async (): Promise<void> => {
    if (!currentShift) return

    setLoading(true)
    try {
      const response = await window.api.db.expenses.getByShiftId(currentShift.id)
      if (response.success) {
        setExpenses(response.data || [])
      } else {
        showSnackbar('Gagal memuat pengeluaran', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat memuat pengeluaran', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentShift])

  useEffect(() => {
    loadExpenses()
  }, [currentShift, loadExpenses])

  // Hotkeys implementation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ignore hotkeys when user is typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only handle Escape key when typing
        if (event.key === 'Escape' && formOpen) {
          event.preventDefault()
          handleFormClose()
        }
        return
      }

      // Ctrl/Cmd + N: Add new expense
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        handleAddExpense()
        return
      }

      // Ctrl/Cmd + F: Focus search field
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // Escape: Close form/dialog
      if (event.key === 'Escape' && formOpen) {
        event.preventDefault()
        handleFormClose()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [formOpen])

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity })
  }, [])

  const handleAddExpense = (): void => {
    setEditingExpense(null)
    setFormOpen(true)
  }

  const handleEditExpense = (expense: Expense): void => {
    setEditingExpense(expense)
    setFormOpen(true)
  }

  const handleDeleteExpense = async (expenseId: string): Promise<void> => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return

    try {
      const response = await window.api.db.expenses.delete(expenseId)
      if (response.success) {
        showSnackbar('Pengeluaran berhasil dihapus', 'success')
        await loadExpenses()
      } else {
        showSnackbar('Gagal menghapus pengeluaran', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat menghapus pengeluaran', 'error')
    }
  }

  const handleFormSubmit = async (data: ExpenseFormData): Promise<void> => {
    if (!currentShift) {
      showSnackbar('Tidak ada shift aktif yang ditemukan', 'error')
      return
    }

    try {
      const expenseData = {
        shiftId: currentShift.id,
        item: data.item,
        quantity: data.quantity,
        price: data.price.toString(),
        description: data.description,
        createdBy: currentShift.userId
      }

      let response
      if (editingExpense) {
        response = await window.api.db.expenses.update(editingExpense.id, expenseData)
      } else {
        response = await window.api.db.expenses.create(expenseData)
      }

      if (response.success) {
        showSnackbar(
          editingExpense ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan',
          'success'
        )
        setFormOpen(false)
        await loadExpenses()
      } else {
        showSnackbar(
          editingExpense ? 'Gagal memperbarui pengeluaran' : 'Gagal menambahkan pengeluaran',
          'error'
        )
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showSnackbar('Terjadi kesalahan saat menyimpan pengeluaran: ' + errorMessage, 'error')
    }
  }

  const handleFormClose = (): void => {
    setFormOpen(false)
    setEditingExpense(null)
  }

  const handlePrintExpenseReport = async (): Promise<void> => {
    if (!currentShift || expenses.length === 0) {
      showSnackbar('Tidak ada data untuk dicetak', 'error')
      return
    }

    try {
      const reportData = {
        date: new Date().toLocaleDateString('id-ID'),
        shiftId: currentShift.id,
        shiftName: currentShift.userName,
        expenses: expenses.map((expense) => ({
          item: expense.item,
          quantity: expense.quantity,
          price: expense.price,
          total: expense.total,
          description: expense.description
        })),
        totalExpenses: summaryStats.total,
        expenseCount: summaryStats.count
      }

      const response = await window.api.db.printer.printExpenseReport(reportData)
      if (response.success) {
        showSnackbar('Laporan pengeluaran berhasil dicetak', 'success')
      } else {
        showSnackbar('Gagal mencetak laporan pengeluaran', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat mencetak laporan', 'error')
    }
  }

  // Filter expenses based on search term
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses

    return expenses.filter(
      (expense) =>
        expense.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    )
  }, [expenses, searchTerm])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.total), 0)
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0

    return {
      total: totalExpenses,
      count: expenses.length,
      average: averageExpense
    }
  }, [expenses])

  if (!currentShift) {
    return (
      <>
        <Alert severity="warning">
          Anda perlu memiliki shift aktif untuk mengelola pengeluaran. Silakan buka shift terlebih
          dahulu.
        </Alert>
      </>
    )
  }

  return (
    <>
      <Stack spacing={3}>
        {/* Enhanced Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}
        >
          <Box>
            <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
              Pengeluaran Harian
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Kelola pengeluaran operasional untuk shift aktif
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            {hasPermission('operations.expense.create') && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleAddExpense}
                disabled={loading}
                size="medium"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  boxShadow: theme.shadows[4]
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '0.875rem' }}>Tambah Pengeluaran</Typography>
                  <Kbd keys={['Ctrl', 'N']} size="small" />
                </Box>
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrintExpenseReport}
              disabled={loading || expenses.length === 0}
              size="medium"
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5
              }}
            >
              Cetak Laporan
            </Button>
          </Stack>
        </Box>

        {/* Current Shift Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            borderRadius: 2
          }}
        >
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 32,
              height: 32,
              fontSize: 16
            }}
          >
            <ReceiptIcon fontSize="small" />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Shift Aktif
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {currentShift.userName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Dibuka:{' '}
              {new Date(currentShift.openedAt).toLocaleString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Box>
        </Box>

        {/* Summary Statistics Cards */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.04),
                border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <TrendingUpIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Pengeluaran
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {formatCurrency(summaryStats.total)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.04),
                border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <ShoppingCartIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Jumlah Item
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="info.main">
                      {summaryStats.count}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.04),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.12)}`,
                borderRadius: 2
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                    <ReceiptIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Rata-rata
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {formatCurrency(summaryStats.average)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Section */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Cari pengeluaran
              </Typography>
              <Kbd keys={['Ctrl', 'F']} size="small" />
            </Box>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              placeholder="Cari berdasarkan nama item atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            {searchTerm && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={`${filteredExpenses.length} hasil ditemukan`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  onDelete={() => setSearchTerm('')}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Expense List */}
        {searchTerm && filteredExpenses.length === 0 && expenses.length > 0 ? (
          <Card sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
            <CardContent>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Tidak ada hasil ditemukan
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tidak ada pengeluaran yang cocok dengan pencarian &quot;{searchTerm}&quot;
              </Typography>
              <Button variant="outlined" onClick={() => setSearchTerm('')} sx={{ mt: 2 }}>
                Hapus Pencarian
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            canEdit={hasPermission('operations.expense.create')}
            canDelete={hasPermission('operations.expense.delete')}
            loading={loading}
          />
        )}
      </Stack>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add expense"
        onClick={handleAddExpense}
        disabled={loading}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Expense Form Dialog */}
      <ExpenseForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={
          editingExpense
            ? {
                item: editingExpense.item,
                quantity: editingExpense.quantity,
                price: parseFloat(editingExpense.price),
                description: editingExpense.description || ''
              }
            : undefined
        }
        loading={loading}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
