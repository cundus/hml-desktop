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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi')
})

type CategoryFormValues = z.infer<typeof categorySchema>

type Category = CategoryFormValues & {
  id: string
}

export default function CategoryPage(): React.JSX.Element {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' }
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.categories.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat kategori')
      }
    } catch (err) {
      setError('Gagal memuat kategori')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '' })
    setDialogOpen(true)
  }

  const openEdit = (category: Category): void => {
    setEditing(category)
    reset({ name: category.name })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: CategoryFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.categories.update(editing.id, values)
        if (response.success) {
          setItems((prev) => prev.map((c) => (c.id === editing.id ? response.data : c)))
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan kategori')
          return
        }
      } else {
        const response = await window.api.db.categories.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan kategori')
          return
        }
      }
      closeDialog()
    } catch {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus kategori ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.categories.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((c) => c.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus kategori')
      }
    } catch {
      globalAlert.error('Gagal menghapus kategori')
    }
  }
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Kategori Produk</Typography>
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
                <TableCell>Nama</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(category)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(category.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    Tidak ada kategori
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
              {...register('name')}
              label="Nama"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
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
