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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const storeSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  type: z.string().min(1, 'Tipe wajib diisi'),
  defaultSalesId: z.string().optional()
})

type StoreFormValues = z.infer<typeof storeSchema>

type Store = StoreFormValues & {
  id: string
}

interface SalesPerson {
  id: string
  name: string
  isActive: boolean
}

const storeTypes = ['RETAIL', 'WAREHOUSE', 'DISTRIBUTION']

export default function StorePage(): React.JSX.Element {
  const [items, setItems] = useState<Store[]>([])
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Store | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: { code: '', name: '', address: '', phone: '', email: '', type: 'RETAIL', defaultSalesId: '' }
  })

  useEffect(() => {
    loadStores()
    loadSalesPersons()
  }, [])

  const loadStores = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.stores.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat toko')
      }
    } catch {
      setError('Gagal memuat toko')
    } finally {
      setLoading(false)
    }
  }

  const loadSalesPersons = async (): Promise<void> => {
    try {
      const response = await window.api.db.salesPersons.getActive()
      if (response.success) {
        setSalesPersons(response.data ?? [])
      }
    } catch {
      // Ignore - sales persons are optional
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '', address: '', phone: '', email: '', type: 'RETAIL', defaultSalesId: '' })
    setDialogOpen(true)
  }

  const openEdit = (store: Store): void => {
    setEditing(store)
    reset({
      code: store.code,
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      type: store.type,
      defaultSalesId: store.defaultSalesId || ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: StoreFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.stores.update(editing.id, values)
        if (response.success) {
          setItems((prev) => prev.map((s) => (s.id === editing.id ? response.data : s)))
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan toko')
          return
        }
      } else {
        const response = await window.api.db.stores.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan toko')
          return
        }
      }
      closeDialog()
    } catch {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus toko ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.stores.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((s) => s.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus toko')
      }
    } catch {
      globalAlert.error('Gagal menghapus toko')
    }
  }
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Toko</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tambah Toko
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
                <TableCell>Alamat</TableCell>
                <TableCell>Telepon</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>{store.code}</TableCell>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{store.type}</TableCell>
                  <TableCell>{store.address || '-'}</TableCell>
                  <TableCell>{store.phone || '-'}</TableCell>
                  <TableCell>{store.email || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(store)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(store.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Tidak ada toko
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Toko' : 'Buat Toko'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('code')}
              label="Kode"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code?.message}
            />
            <TextField
              {...register('name')}
              label="Nama"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              {...register('type')}
              label="Tipe"
              fullWidth
              margin="normal"
              select
              error={!!errors.type}
              helperText={errors.type?.message}
            >
              {storeTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              {...register('address')}
              label="Alamat"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              error={!!errors.address}
              helperText={errors.address?.message}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                {...register('phone')}
                label="Telepon"
                fullWidth
                margin="normal"
                placeholder="Contoh: (021) 123-4567"
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
              <TextField
                {...register('email')}
                label="Email"
                fullWidth
                margin="normal"
                placeholder="Contoh: info@toko.com"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Stack>
            <TextField
              {...register('defaultSalesId')}
              select
              label="Default Sales"
              fullWidth
              margin="normal"
              helperText="Sales yang akan otomatis dipilih saat transaksi di toko ini"
            >
              <MenuItem value="">
                <em>Tidak ada</em>
              </MenuItem>
              {salesPersons.map((sp) => (
                <MenuItem key={sp.id} value={sp.id}>
                  {sp.name}
                </MenuItem>
              ))}
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

