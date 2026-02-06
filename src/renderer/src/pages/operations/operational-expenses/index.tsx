import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
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
  TableHead,
  TableRow,
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
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

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
        const operationalExpenses = (response.data ?? []).filter(e => !e.shiftId)
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
        globalAlert.success(editing ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan')
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
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')
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
    const category = categories.find(c => c.id === categoryId)
    return category?.name ?? '-'
  }

  const getStoreName = (storeId: string | null): string => {
    if (!storeId) return '-'
    const store = stores.find(s => s.id === storeId)
    return store?.name ?? '-'
  }

  const formatDate = (date: Date): string => {
    const d = new Date(date)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.total), 0)

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
                <MenuItem key={idx} value={idx}>{month}</MenuItem>
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
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tambah Pengeluaran
          </Button>
        </Stack>
      </Stack>

      {/* Summary Card */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2">Total Pengeluaran Bulan {MONTHS[filterMonth]} {filterYear}</Typography>
            <Typography variant="h4" fontWeight="bold">{formatCurrency(totalExpenses)}</Typography>
          </Box>
          <Chip label={`${expenses.length} transaksi`} color="default" sx={{ bgcolor: 'primary.light' }} />
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tanggal</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Toko</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Harga</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.createdAt)}</TableCell>
                  <TableCell>
                    <Chip label={getCategoryName(expense.categoryId)} size="small" color="secondary" variant="outlined" />
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
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Tidak ada pengeluaran di bulan ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
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
                    <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
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
    </>
  )
}
