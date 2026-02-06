import { useEffect, useState } from 'react'
import { globalAlert } from '../../../lib/globalAlert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const expenseCategorySchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(20, 'Kode maksimal 20 karakter'),
  name: z.string().min(1, 'Nama wajib diisi'),
  type: z.enum(['shift', 'operational']),
  isActive: z.boolean()
})

type ExpenseCategoryFormValues = z.infer<typeof expenseCategorySchema>

type ExpenseCategory = ExpenseCategoryFormValues & {
  id: string
  createdAt: Date
  updatedAt: Date
}

export default function ExpenseCategoryPage(): React.JSX.Element {
  const [items, setItems] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: { code: '', name: '', type: 'operational', isActive: true }
  })

  const selectedType = watch('type')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.expenseCategories.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat kategori pengeluaran')
      }
    } catch (err) {
      setError('Gagal memuat kategori pengeluaran')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '', type: 'operational', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (item: ExpenseCategory): void => {
    setEditing(item)
    reset({ code: item.code, name: item.name, type: item.type, isActive: item.isActive })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: ExpenseCategoryFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.expenseCategories.update(editing.id, values)
        if (response.success && response.data) {
          setItems((prev) =>
            prev.map((item) => (item.id === editing.id ? response.data! : item))
          )
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan kategori')
          return
        }
      } else {
        const response = await window.api.db.expenseCategories.create(values)
        if (response.success && response.data) {
          setItems((prev) => [...prev, response.data!])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan kategori')
          return
        }
      }
      closeDialog()
    } catch (err) {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus kategori ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.expenseCategories.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus kategori')
      }
    } catch (err) {
      globalAlert.error('Gagal menghapus kategori')
    }
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Kategori Pengeluaran</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tambah Kategori
        </Button>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kode</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Tipe</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography fontWeight="500">{item.code}</Typography>
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.type === 'shift' ? 'Kasir' : 'Operasional'}
                      color={item.type === 'shift' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.isActive ? 'Aktif' : 'Nonaktif'}
                      color={item.isActive ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Tidak ada kategori pengeluaran
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Kategori' : 'Buat Kategori'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('code')}
              label="Kode"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code?.message}
              disabled={!!editing}
              placeholder="Contoh: GAJI, LISTRIK"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              {...register('name')}
              label="Nama"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              placeholder="Contoh: Gaji Karyawan, Listrik & Air"
            />
            <TextField
              select
              label="Tipe"
              value={selectedType}
              onChange={(e) => setValue('type', e.target.value as 'shift' | 'operational')}
              fullWidth
              margin="normal"
              error={!!errors.type}
              helperText={errors.type?.message || 'Shift = muncul di settlement, Operasional = langsung ke laporan'}
            >
              <MenuItem value="shift">Kasir (Shift)</MenuItem>
              <MenuItem value="operational">Operasional</MenuItem>
            </TextField>
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
