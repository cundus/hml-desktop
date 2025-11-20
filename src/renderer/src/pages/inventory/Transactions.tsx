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
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const transactionSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  storeId: z.string().min(1, 'Store is required'),
  type: z.enum(['INBOUND', 'OUTBOUND', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'SALE']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  reference: z.string().optional(),
  batchId: z.string().optional(),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  performedBy: z.string().optional()
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface StockTransaction extends TransactionFormValues {
  id: string
  createdAt: Date
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

interface Filters {
  productId: string
  storeId: string
  type: string
  startDate: string
  endDate: string
}

export default function TransactionsPage(): React.JSX.Element {
  const [items, setItems] = useState<StockTransaction[]>([])
  const [filteredItems, setFilteredItems] = useState<StockTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    productId: '',
    storeId: '',
    type: '',
    startDate: '',
    endDate: ''
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      productId: '',
      storeId: '',
      type: 'INBOUND',
      quantity: 1,
      reference: '',
      batchId: '',
      supplierId: '',
      customerId: '',
      performedBy: ''
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [items, filters])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [transactionsRes, productsRes, storesRes] = await Promise.all([
        window.api.db.stockTransactions.getAll(),
        window.api.db.products.getAll(),
        window.api.db.stores.getAll()
      ])

      if (transactionsRes.success && productsRes.success && storesRes.success) {
        const productsMap = new Map(productsRes.data?.map((p) => [p.id, p.name]))
        const storesMap = new Map(storesRes.data?.map((s) => [s.id, s.name]))

        const enrichedTransactions = (transactionsRes.data ?? []).map((txn) => ({
          ...txn,
          productName: productsMap.get(txn.productId),
          storeName: storesMap.get(txn.storeId)
        }))

        setItems(enrichedTransactions)
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

  const applyFilters = (): void => {
    let filtered = [...items]

    if (filters.productId) {
      filtered = filtered.filter((item) => item.productId === filters.productId)
    }

    if (filters.storeId) {
      filtered = filtered.filter((item) => item.storeId === filters.storeId)
    }

    if (filters.type) {
      filtered = filtered.filter((item) => item.type === filters.type)
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime()
      filtered = filtered.filter((item) => new Date(item.createdAt).getTime() >= start)
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime()
      filtered = filtered.filter((item) => new Date(item.createdAt).getTime() <= end)
    }

    setFilteredItems(filtered)
  }

  const openCreate = (): void => {
    reset({
      productId: '',
      storeId: '',
      type: 'INBOUND',
      quantity: 1,
      reference: '',
      batchId: '',
      supplierId: '',
      customerId: '',
      performedBy: ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: TransactionFormValues): Promise<void> => {
    try {
      const response = await window.api.db.stockTransactions.create(values)
      if (response.success) {
        await loadData()
        closeDialog()
      } else {
        alert(response.error)
      }
    } catch (err) {
      alert('Operation failed')
    }
  }

  const clearFilters = (): void => {
    setFilters({
      productId: '',
      storeId: '',
      type: '',
      startDate: '',
      endDate: ''
    })
  }

  const getTypeColor = (type: string): 'success' | 'error' | 'info' | 'warning' => {
    switch (type) {
      case 'INBOUND':
      case 'TRANSFER_IN':
        return 'success'
      case 'OUTBOUND':
      case 'TRANSFER_OUT':
      case 'SALE':
        return 'error'
      case 'ADJUSTMENT':
        return 'warning'
      default:
        return 'info'
    }
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString()
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
        <Typography variant="h4">Stock Transactions</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filters
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Transaction
          </Button>
        </Stack>
      </Stack>

      {filterOpen && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" mb={2}>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Product"
                fullWidth
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              >
                <MenuItem value="">All Products</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Store"
                fullWidth
                value={filters.storeId}
                onChange={(e) => setFilters({ ...filters, storeId: e.target.value })}
              >
                <MenuItem value="">All Stores</MenuItem>
                {stores.map((store) => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Type"
                fullWidth
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="INBOUND">Inbound</MenuItem>
                <MenuItem value="OUTBOUND">Outbound</MenuItem>
                <MenuItem value="TRANSFER_IN">Transfer In</MenuItem>
                <MenuItem value="TRANSFER_OUT">Transfer Out</MenuItem>
                <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                <MenuItem value="SALE">Sale</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="outlined" fullWidth onClick={clearFilters}>
                Clear Filters
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date/Time</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell>{formatDate(txn.createdAt)}</TableCell>
                <TableCell>{txn.productName || txn.productId}</TableCell>
                <TableCell>{txn.storeName || txn.storeId}</TableCell>
                <TableCell>
                  <Chip label={txn.type} color={getTypeColor(txn.type)} size="small" />
                </TableCell>
                <TableCell align="right">{txn.quantity}</TableCell>
                <TableCell>{txn.reference || '-'}</TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Stock Transaction</DialogTitle>
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
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Transaction Type"
                  fullWidth
                  margin="normal"
                  error={!!errors.type}
                  helperText={errors.type?.message}
                >
                  <MenuItem value="INBOUND">Inbound</MenuItem>
                  <MenuItem value="OUTBOUND">Outbound</MenuItem>
                  <MenuItem value="TRANSFER_IN">Transfer In</MenuItem>
                  <MenuItem value="TRANSFER_OUT">Transfer Out</MenuItem>
                  <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                  <MenuItem value="SALE">Sale</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Quantity"
                  type="number"
                  fullWidth
                  margin="normal"
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  inputProps={{ min: 1 }}
                />
              )}
            />

            <TextField
              {...register('reference')}
              label="Reference (Optional)"
              fullWidth
              margin="normal"
              error={!!errors.reference}
              helperText={errors.reference?.message}
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
