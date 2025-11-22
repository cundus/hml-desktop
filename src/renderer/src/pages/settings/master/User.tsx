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
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const userSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Alamat email tidak valid'),
  // Kosongkan saat edit jika tidak ingin mengubah kata sandi
  password: z
    .string()
    .min(6, 'Kata sandi minimal 6 karakter')
    .or(z.literal('')),
  storeId: z.string().optional(),
  roleIds: z.array(z.string())
})

export type UserFormValues = z.infer<typeof userSchema>

export type User = {
  id: string
  name: string
  email: string
  storeId: string | null
  storeName?: string
  roleIds: string[]
  roleNames: string[]
}

type Store = {
  id: string
  name: string
}

type Role = {
  id: string
  name: string
}

export default function UserPage(): React.JSX.Element {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', storeId: '', roleIds: [] }
  })

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        const [usersRes, storesRes, rolesRes, userRolesRes] = await Promise.all([
          window.api.db.users.getAll(),
          window.api.db.stores.getAll(),
          window.api.db.roles.getAll(),
          window.api.db.userRoles.getAll()
        ])

        if (usersRes.success && storesRes.success && rolesRes.success && userRolesRes.success) {
          const usersData = usersRes.data ?? []
          const storesData = storesRes.data ?? []
          const rolesData = rolesRes.data ?? []
          const userRolesData = userRolesRes.data ?? []

          const storeMap = new Map(storesData.map((s: any) => [s.id, s.name as string]))
          const rolesMap = new Map(rolesData.map((r: any) => [r.id, r.name as string]))

          const itemsWithRelations: User[] = usersData.map((user: any) => {
            const userRoleIds = userRolesData
              .filter((ur: any) => ur.userId === user.id)
              .map((ur: any) => ur.roleId as string)

            const roleNames = userRoleIds
              .map((id: string) => rolesMap.get(id))
              .filter((name): name is string => Boolean(name))

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              storeId: user.storeId ?? null,
              storeName: user.storeId ? (storeMap.get(user.storeId) as string | undefined) : undefined,
              roleIds: userRoleIds,
              roleNames
            }
          })

          setItems(itemsWithRelations)
          setStores(storesData.map((s: any) => ({ id: s.id as string, name: s.name as string })))
          setRoles(rolesData.map((r: any) => ({ id: r.id as string, name: r.name as string })))
        } else {
          setError(
            usersRes.error ??
              storesRes.error ??
              rolesRes.error ??
              userRolesRes.error ??
              'Gagal memuat pengguna'
          )
        }
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
    reset({ name: '', email: '', password: '', storeId: '', roleIds: [] })
    setDialogOpen(true)
  }

  const openEdit = (user: User): void => {
    setEditing(user)
    reset({
      name: user.name,
      email: user.email,
      password: '',
      storeId: user.storeId ?? '',
      roleIds: user.roleIds ?? []
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: UserFormValues): Promise<void> => {
    try {
      // Pada saat membuat user baru, kata sandi wajib diisi
      if (!editing && !values.password) {
        setError('Kata sandi wajib diisi untuk pengguna baru')
        return
      }

      const selectedRoleIds = values.roleIds ?? []

      if (editing) {
        const updatePayload: { name?: string; email?: string; password?: string; storeId?: string } = {
          name: values.name,
          email: values.email
        }

        // Hanya kirim password jika diisi (artinya ingin diganti)
        if (values.password) {
          updatePayload.password = values.password
        }

        if (values.storeId) {
          updatePayload.storeId = values.storeId
        }

        const response = await window.api.db.users.update(editing.id, updatePayload)

        if (response.success && response.data) {
          const updated = response.data

          const rolesResponse = await window.api.db.userRoles.setForUser(
            editing.id,
            selectedRoleIds
          )

          if (!rolesResponse.success) {
            setError(rolesResponse.error ?? 'Gagal menyimpan peran pengguna')
            return
          }

          const roleNames = selectedRoleIds
            .map((id) => roles.find((r) => r.id === id)?.name)
            .filter((name): name is string => Boolean(name))

          const storeName = updated.storeId
            ? stores.find((s) => s.id === updated.storeId)?.name
            : undefined

          setItems((prev) =>
            prev.map((u) =>
              u.id === editing.id
                ? {
                    id: updated.id,
                    name: updated.name,
                    email: updated.email,
                    storeId: updated.storeId,
                    storeName,
                    roleIds: selectedRoleIds,
                    roleNames
                  }
                : u
            )
          )
        } else {
          setError(response.error ?? 'Gagal menyimpan pengguna')
          return
        }
      } else {
        const response = await window.api.db.users.create({
          name: values.name,
          email: values.email,
          password: values.password,
          storeId: values.storeId || undefined
        })

        if (response.success && response.data) {
          const created = response.data
          const rolesResponse = await window.api.db.userRoles.setForUser(
            created.id,
            selectedRoleIds
          )

          if (!rolesResponse.success) {
            setError(rolesResponse.error ?? 'Gagal menyimpan peran pengguna')
            return
          }

          const roleNames = selectedRoleIds
            .map((id) => roles.find((r) => r.id === id)?.name)
            .filter((name): name is string => Boolean(name))

          const storeName = created.storeId
            ? stores.find((s) => s.id === created.storeId)?.name
            : undefined

          setItems((prev) => [
            ...prev,
            {
              id: created.id,
              name: created.name,
              email: created.email,
              storeId: created.storeId,
              storeName,
              roleIds: selectedRoleIds,
              roleNames
            }
          ])
        } else {
          setError(response.error ?? 'Gagal menyimpan pengguna')
          return
        }
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan pengguna')
    }
  }

  const handleDelete = async (user: User): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return
      const response = await window.api.db.users.delete(user.id)
      if (!response.success) {
        setError(response.error ?? 'Gagal menghapus pengguna')
        return
      }
    } catch {
      setError('Gagal menghapus pengguna')
      return
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
                <TableCell>Nama</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Toko</TableCell>
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
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.storeName ?? '-'}</TableCell>
                    <TableCell>
                      {user.roleNames.length === 0
                        ? '-'
                        : user.roleNames.join(', ')}
                    </TableCell>
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
              label="Nama"
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
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
              label="Kata Sandi"
              fullWidth
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
            />
            <TextField
              margin="normal"
              label="Toko"
              fullWidth
              select
              {...register('storeId')}
              error={!!errors.storeId}
              helperText={errors.storeId?.message}
            >
              <MenuItem value="">Tanpa Toko</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </TextField>
            <Controller
              name="roleIds"
              control={control}
              render={({ field }) => (
                <TextField
                  margin="normal"
                  label="Peran"
                  fullWidth
                  select
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) => {
                      const ids = (selected as string[]) || []
                      if (!ids.length) return 'Tidak ada peran'
                      const names = ids
                        .map((id) => roles.find((r) => r.id === id)?.name)
                        .filter((name): name is string => Boolean(name))
                      return names.join(', ')
                    }
                  }}
                  value={field.value || []}
                  onChange={(e) => {
                    const value = e.target.value
                    const next = Array.isArray(value)
                      ? value
                      : value
                        ? [value as string]
                        : []
                    field.onChange(next)
                  }}
                  error={!!errors.roleIds}
                  helperText={errors.roleIds?.message}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Chip size="small" label={role.name} />
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Batal</Button>
          <Button type="submit" form="user-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
