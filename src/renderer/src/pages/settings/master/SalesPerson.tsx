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
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const salesPersonSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  isActive: z.boolean()
})

type SalesPersonFormValues = z.infer<typeof salesPersonSchema>

type SalesPerson = SalesPersonFormValues & {
  id: string
}

export default function SalesPersonPage(): React.JSX.Element {
  const [items, setItems] = useState<SalesPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalesPerson | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<SalesPersonFormValues>({
    resolver: zodResolver(salesPersonSchema),
    defaultValues: { name: '', isActive: true }
  })

  useEffect(() => {
    loadSalesPersons()
  }, [])

  const loadSalesPersons = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.salesPersons.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat data sales')
      }
    } catch {
      setError('Gagal memuat data sales')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (item: SalesPerson): void => {
    setEditing(item)
    reset({
      name: item.name,
      isActive: item.isActive
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: SalesPersonFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.salesPersons.update(editing.id, values)
        if (response.success) {
          setItems((prev) => prev.map((s) => (s.id === editing.id ? response.data : s)))
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan data sales')
          return
        }
      } else {
        const response = await window.api.db.salesPersons.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan data sales')
          return
        }
      }
      closeDialog()
    } catch {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus sales ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.salesPersons.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((s) => s.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus sales')
      }
    } catch {
      globalAlert.error('Gagal menghapus sales')
    }
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Sales Person</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tambah Sales
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Daftar sales person untuk tracking komisi penjualan. Sales dapat disematkan ke store sebagai
        default.
      </Typography>

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
                <TableCell>Nama Sales</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.isActive ? 'Aktif' : 'Nonaktif'}
                      color={item.isActive ? 'success' : 'default'}
                      size="small"
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
                  <TableCell colSpan={3} align="center">
                    Tidak ada data sales. Tambahkan sales person untuk tracking komisi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Sales Person' : 'Tambah Sales Person'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('name')}
              label="Nama Sales"
              fullWidth
              margin="normal"
              placeholder="Masukkan nama sales"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="Aktif"
                />
              )}
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
