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

const branchSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(6, 'Phone is too short')
})

export type BranchFormValues = z.infer<typeof branchSchema>

export type Branch = BranchFormValues & {
  id: string
}

export default function BranchPage(): React.JSX.Element {
  const [items, setItems] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { code: '', name: '', address: '', phone: '' }
  })

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Branch[]>('/master/branches')
        // setItems(res.data ?? [])
      } catch {
        setError('Failed to load branches')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  console.log(items)

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '', address: '', phone: '' })
    setDialogOpen(true)
  }

  const openEdit = (branch: Branch): void => {
    setEditing(branch)
    reset({ code: branch.code, name: branch.name, address: branch.address, phone: branch.phone })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: BranchFormValues): Promise<void> => {
    try {
      if (editing) {
        const res = await api.put<Branch>(`/master/branches/${editing.id}`, values)
        const updated = res.data ?? { ...editing, ...values }
        setItems((prev) => prev.map((b) => (b.id === editing.id ? updated : b)))
      } else {
        const res = await api.post<Branch>('/master/branches', values)
        const created = res.data ?? {
          id: Date.now().toString(),
          ...values
        }
        setItems((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      setError('Failed to save branch')
    }
  }

  const handleDelete = async (branch: Branch): Promise<void> => {
    try {
      await api.delete(`/master/branches/${branch.id}`)
    } catch {
      setError('Failed to delete branch')
    }
    setItems((prev) => prev.filter((b) => b.id !== branch.id))
  }

  return (
    <Paper elevation={6} square sx={{ p: 4, width: '100%', borderRadius: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Branch</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={loading}>
          Add Branch
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
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                    No branches found
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((branch) => (
                  <TableRow key={branch.id} hover>
                    <TableCell>{branch.code}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.address}</TableCell>
                    <TableCell>{branch.phone}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(branch)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDelete(branch)}
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
        <DialogTitle>{editing ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
        <DialogContent>
          <Box component="form" id="branch-form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              label="Code"
              fullWidth
              {...register('code')}
              error={!!errors.code}
              helperText={errors.code?.message}
            />
            <TextField
              margin="normal"
              label="Name"
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              margin="normal"
              label="Address"
              fullWidth
              {...register('address')}
              error={!!errors.address}
              helperText={errors.address?.message}
            />
            <TextField
              margin="normal"
              label="Phone"
              fullWidth
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
