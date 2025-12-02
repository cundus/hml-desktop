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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MenuItem from '@mui/material/MenuItem'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  categoryId: z.string().optional()
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export type Customer = {
  id: string
  name: string
  phone: string | null
  address: string | null
  categoryId: string | null
  categoryName?: string
}

type CustomerCategory = {
  id: string
  name: string
}

export default function CustomerPage(): React.JSX.Element {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<CustomerCategory[]>([])
  const [dialogOpen, setDialogOpen] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash.includes('add-customer') : false
  )
  const [editing, setEditing] = useState<Customer | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', phone: '', address: '', categoryId: '' }
  })

  useEffect(() => {
    if (dialogOpen && !editing) {
      reset({ name: '', phone: '', address: '', categoryId: '' })
    }
  }, [dialogOpen, editing, reset])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const [customersRes, categoriesRes] = await Promise.all([
          window.api.db.customers.getAll(),
          window.api.db.customerCategories.getAll()
        ])

        if (customersRes.success && categoriesRes.success) {
          const categoryList = categoriesRes.data ?? []
          const categoryMap = new Map(categoryList.map((c) => [c.id, c.name]))

          const customers = (customersRes.data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            categoryId: c.categoryId,
            categoryName: c.categoryId ? (categoryMap.get(c.categoryId) ?? '') : ''
          }))

          setItems(customers)
          setCategories(categoryList)
        } else {
          setError(customersRes.error ?? categoriesRes.error ?? 'Gagal memuat pelanggan')
        }
      } catch {
        setError('Gagal memuat pelanggan')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '', phone: '', address: '', categoryId: '' })
    setDialogOpen(true)
  }

  const openEdit = (customer: Customer): void => {
    setEditing(customer)
    reset({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      categoryId: customer.categoryId ?? ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: CustomerFormValues): Promise<void> => {
    try {
      const payload = {
        name: values.name,
        phone: values.phone || undefined,
        address: values.address || undefined,
        categoryId: values.categoryId || undefined
      }

      if (editing) {
        const response = await window.api.db.customers.update(editing.id, payload)
        if (response.success && response.data) {
          const updated = response.data
          const categoryName = updated.categoryId
            ? (categories.find((c) => c.id === updated.categoryId)?.name ?? '')
            : ''

          setItems((prev) =>
            prev.map((c) =>
              c.id === editing.id
                ? {
                    id: updated.id,
                    name: updated.name,
                    phone: updated.phone,
                    address: updated.address,
                    categoryId: updated.categoryId,
                    categoryName
                  }
                : c
            )
          )
        } else {
          setError(response.error ?? 'Gagal menyimpan pelanggan')
          return
        }
      } else {
        const response = await window.api.db.customers.create(payload)
        if (response.success && response.data) {
          const created = response.data
          const categoryName = created.categoryId
            ? (categories.find((c) => c.id === created.categoryId)?.name ?? '')
            : ''

          setItems((prev) => [
            ...prev,
            {
              id: created.id,
              name: created.name,
              phone: created.phone,
              address: created.address,
              categoryId: created.categoryId,
              categoryName
            }
          ])
        } else {
          setError(response.error ?? 'Gagal menyimpan pelanggan')
          return
        }
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan pelanggan')
    }
  }

  const handleDelete = async (customer: Customer): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return
      const response = await window.api.db.customers.delete(customer.id)
      if (!response.success) {
        setError(response.error ?? 'Gagal menghapus pelanggan')
        return
      }
    } catch {
      setError('Gagal menghapus pelanggan')
    }
    setItems((prev) => prev.filter((c) => c.id !== customer.id))
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Pelanggan</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={loading}>
          Tambah Pelanggan
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
                <TableCell>Nama</TableCell>
                <TableCell>Telepon</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Tidak ada pelanggan
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.categoryName}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(customer)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDelete(customer)}
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
        <DialogTitle>{editing ? 'Ubah Pelanggan' : 'Buat Pelanggan'}</DialogTitle>
        <DialogContent>
          <Box component="form" id="customer-form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
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
              label="Telepon"
              fullWidth
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
            <TextField
              margin="normal"
              label="Alamat"
              fullWidth
              {...register('address')}
              error={!!errors.address}
              helperText={errors.address?.message}
            />
            <TextField
              margin="normal"
              label="Kategori Pelanggan"
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Batal</Button>
          <Button type="submit" form="customer-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
