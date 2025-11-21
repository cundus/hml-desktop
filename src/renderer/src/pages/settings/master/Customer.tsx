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
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../../lib/api'

const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  tier: z.string().optional()
})

export type CustomerFormValues = z.infer<typeof customerSchema>

export type Customer = CustomerFormValues & {
  id: string
}

export default function CustomerPage(): React.JSX.Element {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    defaultValues: { name: '', phone: '', tier: '' }
  })

  useEffect(() => {
    if (dialogOpen && !editing) {
      reset({ name: '', phone: '', tier: '' })
    }
  }, [dialogOpen, editing, reset])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Customer[]>('/master/customers')
        setItems(res.data ?? [])
      } catch {
        setError('Gagal memuat pelanggan')
      } finally {
        alert('Operasi gagal')
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '', phone: '', tier: '' })
    setDialogOpen(true)
  }

  const openEdit = (customer: Customer): void => {
    setEditing(customer)
    reset({ name: customer.name, phone: customer.phone ?? '', tier: customer.tier ?? '' })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: CustomerFormValues): Promise<void> => {
    try {
      if (editing) {
        const res = await api.put<Customer>(`/master/customers/${editing.id}`, values)
        const updated = res.data ?? { ...editing, ...values }
        setItems((prev) => prev.map((c) => (c.id === editing.id ? updated : c)))
      } else {
        const res = await api.post<Customer>('/master/customers', values)
        const created = res.data ?? {
          id: Date.now().toString(),
          ...values
        }
        setItems((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan pelanggan')
    }
  }

  const handleDelete = async (customer: Customer): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return
      await api.delete(`/master/customers/${customer.id}`)
    } catch {
      setError('Gagal menghapus pelanggan')
    }
    setItems((prev) => prev.filter((c) => c.id !== customer.id))
  }

  return (
    <Paper elevation={6} square sx={{ p: 4, width: '100%', borderRadius: 2, height: '100%' }}>
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
                    <TableCell>{customer.tier}</TableCell>
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
              label="Kategori"
              fullWidth
              {...register('tier')}
              error={!!errors.tier}
              helperText={errors.tier?.message}
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
    </Paper>
  )
}
