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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  cost: z.string().min(1, 'Harga pokok wajib diisi'),
  categoryId: z.string().optional(),
  isActive: z.boolean()
})

export type ProductFormValues = z.infer<typeof productSchema>

export type Product = {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  categoryId: string | null
  isActive: boolean
  categoryName?: string
}

type Category = {
  id: string
  name: string
}

export default function ProductPage(): React.JSX.Element {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { sku: '', name: '', unit: 'PCS', cost: '', categoryId: '', isActive: true }
  })

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const [productsRes, categoriesRes] = await Promise.all([
          window.api.db.products.getAll(),
          window.api.db.categories.getAll()
        ])

        if (productsRes.success && categoriesRes.success) {
          const categoryList = categoriesRes.data ?? []
          const categoryMap = new Map(categoryList.map((c) => [c.id, c.name]))

          const products = (productsRes.data ?? []).map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            cost: p.cost,
            categoryId: p.categoryId,
            isActive: p.isActive,
            categoryName: p.categoryId ? categoryMap.get(p.categoryId) ?? '' : ''
          }))

          setItems(products)
          setCategories(categoryList)
        } else {
          setError(
            productsRes.error ??
              categoriesRes.error ??
              'Gagal memuat produk'
          )
        }
      } catch {
        setError('Gagal memuat produk')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({ sku: '', name: '', unit: 'PCS', cost: '', categoryId: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (product: Product): void => {
    setEditing(product)
    reset({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      cost: product.cost,
      categoryId: product.categoryId ?? '',
      isActive: product.isActive
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: ProductFormValues): Promise<void> => {
    try {
      const createPayload = {
        sku: values.sku,
        name: values.name,
        unit: values.unit,
        cost: values.cost,
        categoryId: values.categoryId || undefined,
        isActive: values.isActive
      }

      const updatePayload = {
        name: values.name,
        unit: values.unit,
        cost: values.cost,
        categoryId: values.categoryId || undefined,
        isActive: values.isActive
      }

      if (editing) {
        const response = await window.api.db.products.update(editing.id, updatePayload)
        if (response.success && response.data) {
          const updated = response.data
          const categoryName =
            updated.categoryId
              ? categories.find((c) => c.id === updated.categoryId)?.name ?? ''
              : ''

          setItems((prev) =>
            prev.map((p) =>
              p.id === editing.id
                ? {
                    id: updated.id,
                    sku: updated.sku,
                    name: updated.name,
                    unit: updated.unit,
                    cost: updated.cost,
                    categoryId: updated.categoryId,
                    isActive: updated.isActive,
                    categoryName
                  }
                : p
            )
          )
        } else {
          setError(response.error ?? 'Gagal menyimpan produk')
          return
        }
      } else {
        const response = await window.api.db.products.create(createPayload)
        if (response.success && response.data) {
          const created = response.data
          const categoryName =
            created.categoryId
              ? categories.find((c) => c.id === created.categoryId)?.name ?? ''
              : ''

          setItems((prev) => [
            ...prev,
            {
              id: created.id,
              sku: created.sku,
              name: created.name,
              unit: created.unit,
              cost: created.cost,
              categoryId: created.categoryId,
              isActive: created.isActive,
              categoryName
            }
          ])
        } else {
          setError(response.error ?? 'Gagal menyimpan produk')
          return
        }
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan produk')
    }
  }

  const handleDelete = async (product: Product): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return
      const response = await window.api.db.products.delete(product.id)
      if (!response.success) {
        setError(response.error ?? 'Gagal menghapus produk')
        return
      }
    } catch {
      setError('Gagal menghapus produk')
    }
    setItems((prev) => prev.filter((p) => p.id !== product.id))
  }

  return (
    <>
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
                <TableCell>SKU</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Tidak ada produk
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={product.isActive ? 'Aktif' : 'Nonaktif'}
                        color={product.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
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
              label="SKU"
              fullWidth
              {...register('sku')}
              error={!!errors.sku}
              helperText={errors.sku?.message}
              disabled={!!editing}
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
              label="Satuan"
              fullWidth
              {...register('unit')}
              error={!!errors.unit}
              helperText={errors.unit?.message}
            />
            <TextField
              margin="normal"
              label="Harga Pokok"
              fullWidth
              type="number"
              {...register('cost')}
              error={!!errors.cost}
              helperText={errors.cost?.message}
            />
            <TextField
              margin="normal"
              label="Kategori Produk"
              fullWidth
              select
              {...register('categoryId')}
              error={!!errors.categoryId}
              helperText={errors.categoryId?.message}
            >
              <MenuItem value="">Tanpa Kategori</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Checkbox {...register('isActive')} defaultChecked />}
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Batal</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
