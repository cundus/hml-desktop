import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { globalAlert } from '@renderer/lib/globalAlert'
import { formatCurrency } from '@renderer/utils/currency'
import useAuth from '@renderer/hooks/useAuth'

interface ExpenseCategory {
  id: string
  code: string
  name: string
  type: 'shift' | 'operational'
  isActive: boolean
}

interface Store {
  id: string
  name: string
  code: string
}

interface Expense {
  id: string
  categoryId: string | null
  storeId: string | null
  item: string
  quantity: number
  price: string
  total: string
  description: string | null
  createdBy: string | null
  createdAt: Date
  categoryName?: string
  storeName?: string
}

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  storeId: z.string().min(1, 'Toko wajib dipilih'),
  item: z.string().min(1, 'Item wajib diisi'),
  quantity: z.number().min(1, 'Jumlah minimal 1'),
  price: z.number().min(0, 'Harga harus positif'),
  description: z.string().optional()
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

type SortField = 'createdAt' | 'categoryId' | 'storeId' | 'item' | 'quantity' | 'price' | 'total'

export default function OperationalExpensesPage(): React.JSX.Element {
  const { userId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  // Filter state
  const [filterStoreId, setFilterStoreId] = useState<string>('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Pagination state
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { categoryId: '', storeId: '', item: '', quantity: 1, price: 0, description: '' }
  })

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear - 1, currentYear, currentYear + 1]
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [filterMonth, filterYear])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [filterStoreId, filterCategoryId, filterMonth, filterYear])

  const loadInitialData = async (): Promise<void> => {
    await Promise.all([loadCategories(), loadStores()])
  }

  const loadCategories = async (): Promise<void> => {
    try {
      const response = await window.api.db.expenseCategories.getByType('operational')
      if (response.success) {
        setCategories(response.data ?? [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadStores = async (): Promise<void> => {
    try {
      const response = await window.api.db.stores.getAll()
      if (response.success) {
        setStores(response.data ?? [])
      }
    } catch (error) {
      console.error('Failed to load stores:', error)
    }
  }

  const loadExpenses = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const startDate = new Date(filterYear, filterMonth, 1)
      const endDate = new Date(filterYear, filterMonth + 1, 0)
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]
      const response = await window.api.db.expenses.getByDateRange(startStr, endStr)
      if (response.success) {
        // Filter only operational expenses (no shiftId)
        const operationalExpenses = (response.data ?? []).filter((e) => !e.shiftId)
        setExpenses(operationalExpenses)
      }
    } catch (error) {
      console.error('Failed to load expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterYear])

  const openCreate = (): void => {
    setEditing(null)
    reset({ categoryId: '', storeId: '', item: '', quantity: 1, price: 0, description: '' })
    setDialogOpen(true)
  }

  const openEdit = (expense: Expense): void => {
    setEditing(expense)
    reset({
      categoryId: expense.categoryId ?? '',
      storeId: expense.storeId ?? '',
      item: expense.item,
      quantity: expense.quantity,
      price: Number(expense.price),
      description: expense.description ?? ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: ExpenseFormValues): Promise<void> => {
    try {
      const data = {
        categoryId: values.categoryId,
        storeId: values.storeId,
        item: values.item,
        quantity: values.quantity,
        price: values.price.toString(),
        createdBy: userId ?? undefined
      }

      let response
      if (editing) {
        response = await window.api.db.expenses.update(editing.id, data)
      } else {
        response = await window.api.db.expenses.create(data)
      }

      if (response.success) {
        globalAlert.success(
          editing ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan'
        )
        closeDialog()
        await loadExpenses()
      } else {
        globalAlert.error(response.error ?? 'Gagal menyimpan pengeluaran')
      }
    } catch (error) {
      globalAlert.error('Terjadi kesalahan')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm(
      'Apakah Anda yakin ingin menghapus pengeluaran ini?'
    )
    if (!confirmed) return

    try {
      const response = await window.api.db.expenses.delete(id)
      if (response.success) {
        globalAlert.success('Pengeluaran berhasil dihapus')
        await loadExpenses()
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus pengeluaran')
      }
    } catch (error) {
      globalAlert.error('Terjadi kesalahan')
    }
  }

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return '-'
    const category = categories.find((c) => c.id === categoryId)
    return category?.name ?? '-'
  }

  const getStoreName = (storeId: string | null): string => {
    if (!storeId) return '-'
    const store = stores.find((s) => s.id === storeId)
    return store?.name ?? '-'
  }

  const formatDate = (date: Date): string => {
    const d = new Date(date)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  // Filtered expenses based on store and category filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStoreId && e.storeId !== filterStoreId) return false
      if (filterCategoryId && e.categoryId !== filterCategoryId) return false
      return true
    })
  }, [expenses, filterStoreId, filterCategoryId])

  // Total from filtered expenses
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.total), 0)
  }, [filteredExpenses])

  // Sorted expenses
  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses]
    sorted.sort((a, b) => {
      let valA: string | number
      let valB: string | number

      switch (sortField) {
        case 'createdAt':
          valA = new Date(a.createdAt).getTime()
          valB = new Date(b.createdAt).getTime()
          break
        case 'categoryId':
          valA = getCategoryName(a.categoryId).toLowerCase()
          valB = getCategoryName(b.categoryId).toLowerCase()
          break
        case 'storeId':
          valA = getStoreName(a.storeId).toLowerCase()
          valB = getStoreName(b.storeId).toLowerCase()
          break
        case 'item':
          valA = a.item.toLowerCase()
          valB = b.item.toLowerCase()
          break
        case 'quantity':
          valA = a.quantity
          valB = b.quantity
          break
        case 'price':
          valA = Number(a.price)
          valB = Number(b.price)
          break
        case 'total':
          valA = Number(a.total)
          valB = Number(b.total)
          break
        default:
          return 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredExpenses, sortField, sortDirection, categories, stores])

  // Paginated expenses
  const paginatedExpenses = useMemo(() => {
    const start = page * rowsPerPage
    return sortedExpenses.slice(start, start + rowsPerPage)
  }, [sortedExpenses, page, rowsPerPage])

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleChangePage = (_: unknown, newPage: number): void => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5">Pengeluaran Operasional</Typography>
          <Typography variant="body2" color="text.secondary">
            Pengeluaran bulanan yang tidak terkait shift kasir
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Bulan</InputLabel>
            <Select
              value={filterMonth}
              label="Bulan"
              onChange={(e) => setFilterMonth(e.target.value as number)}
            >
              {MONTHS.map((month, idx) => (
                <MenuItem key={idx} value={idx}>
                  {month}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Tahun</InputLabel>
            <Select
              value={filterYear}
              label="Tahun"
              onChange={(e) => setFilterYear(e.target.value as number)}
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tambah Pengeluaran
          </Button>
        </Stack>
      </Stack>

      {/* Store & Category Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select
            label="Filter Toko"
            value={filterStoreId}
            onChange={(e) => setFilterStoreId(e.target.value)}
            size="small"
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
            select
            label="Filter Kategori"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Semua Kategori</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Summary Card */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2">
              Total Pengeluaran Bulan {MONTHS[filterMonth]} {filterYear}
              {filterStoreId &&
                ` — ${stores.find((s) => s.id === filterStoreId)?.name ?? ''}`}
              {filterCategoryId &&
                ` — ${categories.find((c) => c.id === filterCategoryId)?.name ?? ''}`}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {formatCurrency(totalExpenses)}
            </Typography>
          </Box>
          <Chip
            label={`${filteredExpenses.length} transaksi`}
            color="default"
            sx={{ bgcolor: 'primary.light' }}
          />
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'createdAt'}
                      direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                      onClick={() => handleSort('createdAt')}
                    >
                      Tanggal
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'categoryId'}
                      direction={sortField === 'categoryId' ? sortDirection : 'asc'}
                      onClick={() => handleSort('categoryId')}
                    >
                      Kategori
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'storeId'}
                      direction={sortField === 'storeId' ? sortDirection : 'asc'}
                      onClick={() => handleSort('storeId')}
                    >
                      Toko
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'item'}
                      direction={sortField === 'item' ? sortDirection : 'asc'}
                      onClick={() => handleSort('item')}
                    >
                      Item
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'quantity'}
                      direction={sortField === 'quantity' ? sortDirection : 'asc'}
                      onClick={() => handleSort('quantity')}
                    >
                      Qty
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'price'}
                      direction={sortField === 'price' ? sortDirection : 'asc'}
                      onClick={() => handleSort('price')}
                    >
                      Harga
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'total'}
                      direction={sortField === 'total' ? sortDirection : 'asc'}
                      onClick={() => handleSort('total')}
                    >
                      Total
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getCategoryName(expense.categoryId)}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{getStoreName(expense.storeId)}</TableCell>
                    <TableCell>{expense.item}</TableCell>
                    <TableCell align="right">{expense.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(Number(expense.price))}</TableCell>
                    <TableCell align="right">{formatCurrency(Number(expense.total))}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(expense)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(expense.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Tidak ada pengeluaran di bulan ini
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredExpenses.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Baris per halaman"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} dari ${count !== -1 ? count : `lebih dari ${to}`}`
            }
          />
        </Paper>
      )}

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
          <DialogContent>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Kategori"
                  fullWidth
                  margin="normal"
                  error={!!errors.categoryId}
                  helperText={errors.categoryId?.message}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="storeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Toko"
                  fullWidth
                  margin="normal"
                  error={!!errors.storeId}
                  helperText={errors.storeId?.message}
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              {...register('item')}
              label="Nama Item"
              fullWidth
              margin="normal"
              error={!!errors.item}
              helperText={errors.item?.message}
              placeholder="Contoh: Tagihan listrik bulan Januari"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                {...register('quantity', { valueAsNumber: true })}
                label="Jumlah"
                type="number"
                margin="normal"
                error={!!errors.quantity}
                helperText={errors.quantity?.message}
                sx={{ width: 120 }}
              />
              <TextField
                {...register('price', { valueAsNumber: true })}
                label="Harga"
                type="number"
                fullWidth
                margin="normal"
                error={!!errors.price}
                helperText={errors.price?.message}
              />
            </Stack>
            <TextField
              {...register('description')}
              label="Catatan"
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Batal</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Print-only section: all filtered+sorted data, no pagination */}
      <Box
        className="print-only"
        sx={{ display: 'none' }}
      >
        <Typography variant="h5" fontWeight={700} textAlign="center" mb={0.5}>
          Laporan Pengeluaran Operasional
        </Typography>
        <Typography variant="body2" textAlign="center" color="text.secondary" mb={0.5}>
          Periode: {MONTHS[filterMonth]} {filterYear}
          {filterStoreId && ` — Toko: ${stores.find((s) => s.id === filterStoreId)?.name ?? ''}`}
          {filterCategoryId && ` — Kategori: ${categories.find((c) => c.id === filterCategoryId)?.name ?? ''}`}
        </Typography>
        <Typography variant="body2" textAlign="center" mb={2}>
          Total: {formatCurrency(totalExpenses)} ({filteredExpenses.length} transaksi)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell>Item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Harga</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedExpenses.map((expense, idx) => (
              <TableRow key={expense.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{formatDate(expense.createdAt)}</TableCell>
                <TableCell>{getCategoryName(expense.categoryId)}</TableCell>
                <TableCell>{getStoreName(expense.storeId)}</TableCell>
                <TableCell>{expense.item}</TableCell>
                <TableCell align="right">{expense.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(Number(expense.price))}</TableCell>
                <TableCell align="right">{formatCurrency(Number(expense.total))}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={7} sx={{ fontWeight: 700 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totalExpenses)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-only,
          .print-only * {
            visibility: visible !important;
            display: revert !important;
          }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .print-only table {
            width: 100%;
            border-collapse: collapse;
          }
          .print-only th,
          .print-only td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            font-size: 11px;
          }
          @page {
            margin: 1cm;
            size: landscape;
          }
        }
      `}</style>
    </>
  )
}
