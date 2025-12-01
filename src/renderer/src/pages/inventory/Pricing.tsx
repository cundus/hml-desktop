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
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const priceSchema = z.object({
  productId: z.string().min(1, 'Produk wajib diisi'),
  storeId: z.string().min(1, 'Toko wajib diisi'),
  price: z.string().min(1, 'Harga wajib diisi'),
  cost: z.string().min(1, 'Biaya wajib diisi'),
  isActive: z.boolean().optional()
})

type PriceFormValues = z.infer<typeof priceSchema>

interface ProductPrice extends PriceFormValues {
  id: string
  productName?: string
  storeName?: string
  margin?: number
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
    setValue,
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

  // Watch cost and price for margin calculation
  const watchCost = useWatch({ control, name: 'cost' })
  const watchPrice = useWatch({ control, name: 'price' })

  // Calculate current margin
  const currentMargin = (() => {
    const costNum = parseFloat(watchCost) || 0
    const priceNum = parseFloat(watchPrice) || 0
    if (costNum > 0) {
      return ((priceNum - costNum) / costNum) * 100
    }
    return 0
  })()

  // Handle margin input to auto-update selling price
  const handleMarginChange = (marginPercent: string): void => {
    const costNum = parseFloat(watchCost) || 0
    const marginNum = parseFloat(marginPercent) || 0
    if (costNum > 0) {
      const newPrice = costNum * (1 + marginNum / 100)
      setValue('price', newPrice.toFixed(0))
    }
  }

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

        const enrichedPrices = (pricesRes.data ?? []).map((price) => {
          const costNum = parseFloat(price.cost) || 0
          const priceNum = parseFloat(price.price) || 0
          const margin = costNum > 0 ? ((priceNum - costNum) / costNum) * 100 : 0
          return {
            ...price,
            productName: productsMap.get(price.productId),
            storeName: storesMap.get(price.storeId),
            margin: Math.round(margin * 100) / 100
          }
        })

        setItems(enrichedPrices)
        setProducts(productsRes.data ?? [])
        setStores(storesRes.data ?? [])
      } else {
        setError('Gagal memuat data')
      }
    } catch (err) {
      setError('Gagal memuat data')
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
      alert('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Apakah Anda yakin ingin menghapus harga ini?')) return
    try {
      const response = await window.api.db.productPrices.delete(id)
      if (response.success) {
        await loadData()
      } else {
        alert(response.error)
      }
    } catch (err) {
      alert('Gagal menghapus')
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
        <Typography variant="h4">Harga Produk</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Tambah Harga
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell align="right">Harga Modal</TableCell>
              <TableCell align="right">Harga Jual</TableCell>
              <TableCell align="right">Margin</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((price) => (
              <TableRow key={price.id}>
                <TableCell>{price.productName || price.productId}</TableCell>
                <TableCell>{price.storeName || price.storeId}</TableCell>
                <TableCell align="right">
                  {parseFloat(price.cost).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </TableCell>
                <TableCell align="right">
                  {parseFloat(price.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={`${price.margin?.toFixed(1) ?? 0}%`}
                    color={price.margin && price.margin > 0 ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={price.isActive ? 'Aktif' : 'Tidak Aktif'}
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
                <TableCell colSpan={7} align="center">
                  Tidak ada harga
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Harga' : 'Tambah Harga'}</DialogTitle>
          <DialogContent>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Produk"
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
                  label="Toko"
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
              label="Harga Modal"
              type="number"
              fullWidth
              margin="normal"
              error={!!errors.cost}
              helperText={errors.cost?.message}
              inputProps={{ step: '1', min: '0' }}
            />

            <Stack direction="row" spacing={2} alignItems="flex-start">
              <TextField
                {...register('price')}
                label="Harga Jual"
                type="number"
                fullWidth
                margin="normal"
                error={!!errors.price}
                helperText={errors.price?.message}
                inputProps={{ step: '1', min: '0' }}
              />
              <TextField
                label="Margin %"
                type="number"
                margin="normal"
                value={currentMargin.toFixed(1)}
                onChange={(e) => handleMarginChange(e.target.value)}
                inputProps={{ step: '0.1' }}
                sx={{ width: 120 }}
                helperText="Auto-hitung"
              />
            </Stack>

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
                  <MenuItem value="true">Aktif</MenuItem>
                  <MenuItem value="false">Tidak Aktif</MenuItem>
                </TextField>
              )}
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
    </Box>
  )
}
