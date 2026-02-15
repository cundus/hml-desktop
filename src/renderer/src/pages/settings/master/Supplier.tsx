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
import useAuth from '../../../hooks/useAuth'

const supplierSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  address: z.string().optional()
})

type SupplierFormValues = z.infer<typeof supplierSchema>

type Supplier = SupplierFormValues & {
  id: string
}

export default function SupplierPage(): React.JSX.Element {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('master.supplier.create')
  const canEdit = hasPermission('master.supplier.edit')
  const canDelete = hasPermission('master.supplier.delete')

  const [items, setItems] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', phone: '', address: '' }
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.suppliers.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat pemasok')
      }
    } catch (err) {
      setError('Gagal memuat pemasok')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '', phone: '', address: '' })
    setDialogOpen(true)
  }

  const openEdit = (supplier: Supplier): void => {
    setEditing(supplier)
    reset({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: SupplierFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.suppliers.update(editing.id, values)
        if (response.success) {
          setItems((prev) => prev.map((s) => (s.id === editing.id ? response.data : s)))
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan pemasok')
          return
        }
      } else {
        const response = await window.api.db.suppliers.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan pemasok')
          return
        }
      }
      closeDialog()
    } catch {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus pemasok ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.suppliers.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((s) => s.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus pemasok')
      }
    } catch {
      globalAlert.error('Gagal menghapus pemasok')
    }
  }
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Pemasok</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tambah Pemasok
          </Button>
        )}
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
                <TableCell>Telepon</TableCell>
                <TableCell>Alamat</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phone || '-'}</TableCell>
                  <TableCell>{supplier.address || '-'}</TableCell>
                  <TableCell align="right">
                    {canEdit && (
                      <IconButton size="small" onClick={() => openEdit(supplier)}>
                        <EditIcon />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton size="small" onClick={() => handleDelete(supplier.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Tidak ada pemasok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Pemasok' : 'Buat Pemasok'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('name')}
              label="Nama"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField {...register('phone')} label="Telepon" fullWidth margin="normal" />
            <TextField
              {...register('address')}
              label="Alamat"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              error={!!errors.address}
              helperText={errors.address?.message}
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
