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

const customerCategorySchema = z.object({
  name: z.string().min(1, 'Name is required')
})

type CustomerCategoryFormValues = z.infer<typeof customerCategorySchema>

type CustomerCategory = CustomerCategoryFormValues & {
  id: string
}

export default function CustomerCategoryPage(): React.JSX.Element {
  const [items, setItems] = useState<CustomerCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerCategory | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CustomerCategoryFormValues>({
    resolver: zodResolver(customerCategorySchema),
    defaultValues: { name: '' }
  })

  useEffect(() => {
    loadCustomerCategories()
  }, [])

  const loadCustomerCategories = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const response = await window.api.db.customerCategories.getAll()
      if (response.success) {
        setItems(response.data ?? [])
      } else {
        setError(response.error ?? 'Failed to load customer categories')
      }
    } catch (err) {
      setError('Failed to load customer categories')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({ name: '' })
    setDialogOpen(true)
  }

  const openEdit = (category: CustomerCategory): void => {
    setEditing(category)
    reset({ name: category.name })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: CustomerCategoryFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.customerCategories.update(editing.id, values)
        if (response.success) {
          setItems((prev) => prev.map((c) => (c.id === editing.id ? response.data : c)))
        } else {
          alert(response.error)
        }
      } else {
        const response = await window.api.db.customerCategories.create(values)
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
    if (!confirm('Are you sure you want to delete this customer category?')) return
    try {
      const response = await window.api.db.customerCategories.softDelete(id)
      if (response.success) {
        setItems((prev) => prev.filter((c) => c.id !== id))
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
        <Typography variant="h4">Customer Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Category
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(category)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(category.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No customer categories found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit Customer Category' : 'Add Customer Category'}</DialogTitle>
          <DialogContent>
            <TextField
              {...register('name')}
              label="Category Name"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
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
