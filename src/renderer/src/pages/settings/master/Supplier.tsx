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

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  address: z.string().optional()
})

type SupplierFormValues = z.infer<typeof supplierSchema>

type Supplier = SupplierFormValues & {
  id: string
}

export default function SupplierPage(): React.JSX.Element {
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
        setError(response.error ?? 'Failed to load suppliers')
      }
    } catch (err) {
      setError('Failed to load suppliers')
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
          alert(response.error)
        }
      } else {
        const response = await window.api.db.suppliers.create(values)
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
    if (!confirm('Are you sure you want to delete this supplier?')) return
    try {
      const response = await window.api.db.suppliers.softDelete(id)
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
        <Typography variant="h4">Suppliers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Supplier
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.phone || '-'}</TableCell>
                <TableCell>{supplier.address || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(supplier)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(supplier.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No suppliers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('name')}
              label="Supplier Name"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              {...register('phone')}
              label="Phone"
              fullWidth
              margin="normal"
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
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
