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

const priceSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  storeId: z.string().min(1, 'Store is required'),
  price: z.string().min(1, 'Price is required'),
  cost: z.string().min(1, 'Cost is required'),
  isActive: z.boolean().optional()
})

type PriceFormValues = z.infer<typeof priceSchema>

interface ProductPrice extends PriceFormValues {
  id: string
  productName?: string
  storeName?: string
}

interface Product {
  id: string
  name: string
  sku: string
}

interface Store {
  id: string
  name: string
  code: string
}

export default function PricingPage(): React.JSX.Element {
  const [items, setItems] = useState<ProductPrice[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProductPrice | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      productId: '',
      storeId: '',
      price: '',
      cost: '',
      isActive: true
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [pricesRes, productsRes, storesRes] = await Promise.all([
        window.api.db.productPrices.getAll(),
        window.api.db.products.getAll(),
        window.api.db.stores.getAll()
      ])

      if (pricesRes.success && productsRes.success && storesRes.success) {
        const productsMap = new Map(productsRes.data?.map((p) => [p.id, p.name]))
        const storesMap = new Map(storesRes.data?.map((s) => [s.id, s.name]))

        const enrichedPrices = (pricesRes.data ?? []).map((price) => ({
          ...price,
          productName: productsMap.get(price.productId),
          storeName: storesMap.get(price.storeId)
        }))

        setItems(enrichedPrices)
        setProducts(productsRes.data ?? [])
        setStores(storesRes.data ?? [])
      } else {
        setError('Failed to load data')
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = (): void => {
    setEditing(null)
    reset({
      productId: '',
      storeId: '',
      price: '',
      cost: '',
      isActive: true
    })
    setDialogOpen(true)
  }

  const openEdit = (price: ProductPrice): void => {
    setEditing(price)
    reset({
      productId: price.productId,
      storeId: price.storeId,
      price: price.price,
      cost: price.cost,
      isActive: price.isActive
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: PriceFormValues): Promise<void> => {
    try {
      if (editing) {
        const response = await window.api.db.productPrices.update(editing.id, {
          price: values.price,
          cost: values.cost,
          isActive: values.isActive
        })
        if (response.success) {
          await loadData()
        } else {
          alert(response.error)
        }
      } else {
        const response = await window.api.db.productPrices.create(values)
        if (response.success) {
          await loadData()
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
    if (!confirm('Are you sure you want to delete this price?')) return
    try {
      const response = await window.api.db.productPrices.delete(id)
      if (response.success) {
        await loadData()
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
        <Typography variant="h4">Product Pricing</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Price
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Store</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((price) => (
              <TableRow key={price.id}>
                <TableCell>{price.productName || price.productId}</TableCell>
                <TableCell>{price.storeName || price.storeId}</TableCell>
                <TableCell align="right">${price.cost}</TableCell>
                <TableCell align="right">${price.price}</TableCell>
                <TableCell>
                  <Chip
                    label={price.isActive ? 'Active' : 'Inactive'}
                    color={price.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(price)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(price.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No prices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit Price' : 'Add Price'}</DialogTitle>
          <DialogContent>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Product"
                  fullWidth
                  margin="normal"
                  error={!!errors.productId}
                  helperText={errors.productId?.message}
                  disabled={!!editing}
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="storeId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Store"
                  fullWidth
                  margin="normal"
                  error={!!errors.storeId}
                  helperText={errors.storeId?.message}
                  disabled={!!editing}
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <TextField
              {...register('cost')}
              label="Cost"
              type="number"
              fullWidth
              margin="normal"
              error={!!errors.cost}
              helperText={errors.cost?.message}
              inputProps={{ step: '0.01', min: '0' }}
            />

            <TextField
              {...register('price')}
              label="Selling Price"
              type="number"
              fullWidth
              margin="normal"
              error={!!errors.price}
              helperText={errors.price?.message}
              inputProps={{ step: '0.01', min: '0' }}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Status"
                  fullWidth
                  margin="normal"
                  value={field.value ? 'true' : 'false'}
                  onChange={(e) => field.onChange(e.target.value === 'true')}
                >
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </TextField>
              )}
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
