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

const uomSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  name: z.string().min(1, 'Nama wajib diisi')
})

type UomFormValues = z.infer<typeof uomSchema>

type Uom = UomFormValues & {
  id: string
}

export default function UomPage(): React.JSX.Element {
  const [items, setItems] = useState<Uom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Uom | null>(null)
  const { hasPermission } = useAuth()

  const canCreate = hasPermission('master.uom.create')
  const canEdit = hasPermission('master.uom.edit')
  const canDelete = hasPermission('master.uom.delete')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UomFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: { code: '', name: '' }
  })

  useEffect(() => {
    loadUoms()
  }, [])

  const loadUoms = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.uoms.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Gagal memuat satuan')
      }
    } catch (err) {
      setError('Gagal memuat satuan')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '' })
    setDialogOpen(true)
  }

  const openEdit = (uom: Uom): void => {
    setEditing(uom)
    reset({ code: uom.code, name: uom.name })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: UomFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.uoms.update(editing.id, values)
        if (response.success) {
          setItems((prev) =>
            prev.map((u) => (u.id === editing.id ? { ...response.data, id: response.data.id } : u))
          )
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan satuan')
          return
        }
      } else {
        const response = await window.api.db.uoms.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan satuan')
          return
        }
      }
      closeDialog()
    } catch (err) {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus satuan ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.uoms.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((u) => u.id !== id))
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus satuan')
      }
    } catch (err) {
      globalAlert.error('Gagal menghapus satuan')
    }
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Satuan (UOM)</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tambah Satuan
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
                <TableCell>Kode</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((uom) => (
                <TableRow key={uom.id}>
                  <TableCell>
                    <Typography fontWeight="500">{uom.code}</Typography>
                  </TableCell>
                  <TableCell>{uom.name}</TableCell>
                  <TableCell align="right">
                    {canEdit && (
                      <IconButton size="small" onClick={() => openEdit(uom)}>
                        <EditIcon />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton size="small" onClick={() => handleDelete(uom.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Tidak ada satuan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Satuan' : 'Buat Satuan'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('code')}
              label="Kode"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code?.message}
              disabled={!!editing}
              placeholder="Contoh: PCS, KG, BOX"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              {...register('name')}
              label="Nama"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              placeholder="Contoh: Pieces, Kilogram, Box"
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
