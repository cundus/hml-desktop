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

const userSchema = z.object({
  username: z.string().min(1, 'Nama pengguna wajib diisi'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Alamat email tidak valid'),
  role: z.string().min(1, 'Peran wajib diisi')
})

export type UserFormValues = z.infer<typeof userSchema>

export type User = UserFormValues & {
  id: string
}

export default function UserPage(): React.JSX.Element {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: '', fullName: '', email: '', role: '' }
  })

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<User[]>('/master/users')
        setItems(res.data ?? [])
      } catch {
        setError('Gagal memuat pengguna')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({ username: '', fullName: '', email: '', role: '' })
    setDialogOpen(true)
  }

  const openEdit = (user: User): void => {
    setEditing(user)
    reset({ username: user.username, fullName: user.fullName, email: user.email, role: user.role })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: UserFormValues): Promise<void> => {
    try {
      if (editing) {
        const res = await api.put<User>(`/master/users/${editing.id}`, values)
        const updated = res.data ?? { ...editing, ...values }
        setItems((prev) => prev.map((u) => (u.id === editing.id ? updated : u)))
      } else {
        const res = await api.post<User>('/master/users', values)
        const created = res.data ?? {
          id: Date.now().toString(),
          ...values
        }
        setItems((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan pengguna')
    }
  }

  const handleDelete = async (user: User): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return
      await api.delete(`/master/users/${user.id}`)
    } catch {
      setError('Gagal menghapus pengguna')
    }
    setItems((prev) => prev.filter((u) => u.id !== user.id))
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Pengguna</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={loading}>
          Tambah Pengguna
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
                <TableCell>Nama Pengguna</TableCell>
                <TableCell>Nama Lengkap</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Peran</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Sedang memuat...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Tidak ada pengguna
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDelete(user)}
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
        <DialogTitle>{editing ? 'Ubah Pengguna' : 'Buat Pengguna'}</DialogTitle>
        <DialogContent>
          <Box component="form" id="user-form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              label="Nama Pengguna"
              fullWidth
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              margin="normal"
              label="Nama Lengkap"
              fullWidth
              {...register('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />
            <TextField
              margin="normal"
              label="Email"
              fullWidth
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              margin="normal"
              label="Peran"
              fullWidth
              {...register('role')}
              error={!!errors.role}
              helperText={errors.role?.message}
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
