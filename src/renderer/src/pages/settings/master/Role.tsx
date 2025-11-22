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

const roleSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional()
})

type RoleFormValues = z.infer<typeof roleSchema>

type Role = RoleFormValues & {
  id: string
}

export default function RolePage(): React.JSX.Element {
  const [items, setItems] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' }
  })

  useEffect(() => {
    void loadRoles()
  }, [])

  const loadRoles = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.roles.getAll()
      if (response.success) {
        const data = response.data ?? []
        setItems(
          data.map((r: any) => ({
            id: r.id as string,
            name: r.name as string,
            description: (r.description as string | null) ?? ''
          }))
        )
      } else {
        setError(response.error ?? 'Gagal memuat role')
      }
    } catch (err) {
      setError('Gagal memuat role')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '', description: '' })
    setDialogOpen(true)
  }

  const openEdit = (role: Role): void => {
    setEditing(role)
    reset({ name: role.name, description: role.description ?? '' })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: RoleFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.roles.update(editing.id, {
          name: values.name,
          description: values.description || undefined
        })
        if (response.success && response.data) {
          const updated = response.data
          setItems((prev) =>
            prev.map((r) =>
              r.id === editing.id
                ? {
                    id: updated.id,
                    name: updated.name,
                    description: (updated.description as string | null) ?? ''
                  }
                : r
            )
          )
        } else {
          alert(response.error ?? 'Gagal menyimpan role')
        }
      } else {
        const response = await window.api.db.roles.create({
          name: values.name,
          description: values.description || undefined
        })
        if (response.success && response.data) {
          const created = response.data
          setItems((prev) => [
            ...prev,
            {
              id: created.id,
              name: created.name,
              description: (created.description as string | null) ?? ''
            }
          ])
        } else {
          alert(response.error ?? 'Gagal menyimpan role')
        }
      }
      closeDialog()
    } catch (err) {
      alert('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Apakah Anda yakin ingin menghapus role ini?')) return
    try {
      const response = await window.api.db.roles.delete(id)
      if (response.success) {
        setItems((prev) => prev.filter((r) => r.id !== id))
      } else {
        alert(response.error ?? 'Gagal menghapus role')
      }
    } catch (err) {
      alert('Gagal menghapus')
    }
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Role</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tambah Role
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
                <TableCell>Deskripsi</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(role)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(role.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Tidak ada role
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Role' : 'Buat Role'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('name')}
              label="Nama Role"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              {...register('description')}
              label="Deskripsi"
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              error={!!errors.description}
              helperText={errors.description?.message}
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
