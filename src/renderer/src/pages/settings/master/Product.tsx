import { useEffect, useState } from 'react'
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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../../lib/api'

const productSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi')
})

export type ProductFormValues = z.infer<typeof productSchema>

export type Product = ProductFormValues & {
  id: string
}

export default function ProductPage(): React.JSX.Element {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { code: '', name: '', category: '' }
  })

  const categories = ['Food', 'Care', 'Accessories', 'Medicine', 'Others']

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Product[]>('/master/products')
        setItems(res.data ?? [])
      } catch {
        setError('Gagal memuat produk')
      } finally {
        alert('Operasi gagal')
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '', category: '' })
    setDialogOpen(true)
  }

  const openEdit = (product: Product): void => {
    setEditing(product)
    reset({
      code: product.code,
      name: product.name,
      category: product.category
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: ProductFormValues): Promise<void> => {
    try {
      if (editing) {
        const res = await api.put<Product>(`/master/products/${editing.id}`, values)
        const updated = res.data ?? { ...editing, ...values }
        setItems((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
      } else {
        const res = await api.post<Product>('/master/products', values)
        const created = res.data ?? {
          id: Date.now().toString(),
          ...values
        }
        setItems((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan produk')
    }
  }

  const handleDelete = async (product: Product): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return
      await api.delete(`/master/products/${product.id}`)
    } catch {
      setError('Gagal menghapus produk')
    }
    setItems((prev) => prev.filter((p) => p.id !== product.id))
  }

  return (
    <Paper elevation={6} square sx={{ p: 4, width: '100%', borderRadius: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Produk</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={loading}>
          Tambah Produk
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kode</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Tidak ada produk
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(product)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDelete(product)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Ubah Produk' : 'Buat Produk'}</DialogTitle>
        <DialogContent>
          <Box component="form" id="product-form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              label="Kode"
              fullWidth
              {...register('code')}
              error={!!errors.code}
              helperText={errors.code?.message}
            />
            <TextField
              margin="normal"
              label="Nama"
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              margin="normal"
              label="Kategori"
              fullWidth
              select
              {...register('category')}
              error={!!errors.category}
              helperText={errors.category?.message}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Batal</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
