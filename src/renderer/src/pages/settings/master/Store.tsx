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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const storeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  type: z.string().min(1, 'Type is required')
})

type StoreFormValues = z.infer<typeof storeSchema>

type Store = StoreFormValues & {
  id: string
}

const storeTypes = ['RETAIL', 'WAREHOUSE', 'DISTRIBUTION']

export default function StorePage(): React.JSX.Element {
  const [items, setItems] = useState<Store[]>([])
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
    defaultValues: { code: '', name: '', address: '', type: 'RETAIL' }
  })

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.stores.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Failed to load stores')
      }
    } catch (err) {
      setError('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ code: '', name: '', address: '', type: 'RETAIL' })
    setDialogOpen(true)
  }

  const openEdit = (store: Store): void => {
    setEditing(store)
    reset({
      code: store.code,
      name: store.name,
      address: store.address || '',
      type: store.type
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
          alert(response.error)
        }
      } else {
        const response = await window.api.db.stores.create(values)
        if (response.success) {
          setItems((prev) => [...prev, response.data])
        } else {
          alert(response.error)
        }
      }
      closeDialog()
    } catch (err) {
      alert('Operation failed')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this store?')) return
    try {
      const response = await window.api.db.stores.softDelete(id)
      if (response.success) {
        setItems((prev) => prev.filter((s) => s.id !== id))
      } else {
        alert(response.error)
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Stores / Branches</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Store
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((store) => (
              <TableRow key={store.id}>
                <TableCell>{store.code}</TableCell>
                <TableCell>{store.name}</TableCell>
                <TableCell>{store.type}</TableCell>
                <TableCell>{store.address || '-'}</TableCell>
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
                <TableCell colSpan={5} align="center">
                  No stores found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit Store' : 'Add Store'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('code')}
              label="Store Code"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code?.message}
            />
            <TextField
              {...register('name')}
              label="Store Name"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              {...register('type')}
              label="Type"
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
              label="Address"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              error={!!errors.address}
              helperText={errors.address?.message}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}
