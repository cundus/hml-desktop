import { useEffect, useState } from 'react'
import { globalAlert } from '../../lib/globalAlert'
import useAuth from '../../hooks/useAuth'
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
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const batchSchema = z.object({
  productId: z.string().min(1, 'Produk wajib diisi'),
  code: z.string().min(1, 'Kode batch wajib diisi'),
  expiryDate: z.string().optional()
})

type BatchFormValues = z.infer<typeof batchSchema>

interface Batch extends Omit<BatchFormValues, 'expiryDate'> {
  id: string
  expiryDate: Date | null
  productName?: string
}

interface Product {
  id: string
  name: string
  sku: string
}

export default function BatchesPage(): React.JSX.Element {
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<Batch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [expiringBatches, setExpiringBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Batch | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      productId: '',
      code: '',
      expiryDate: ''
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const [batchesRes, productsRes, expiringRes] = await Promise.all([
        window.api.db.batches.getAll(),
        window.api.db.products.getAll(),
        window.api.db.batches.getExpiring(30) // 30 days
      ])

      if (batchesRes.success && productsRes.success) {
        const productsMap = new Map(productsRes.data?.map((p) => [p.id, p.name]))

        const enrichedBatches = (batchesRes.data ?? []).map((batch) => ({
          ...batch,
          productName: productsMap.get(batch.productId)
        }))

        setItems(enrichedBatches)
        setProducts(productsRes.data ?? [])

        if (expiringRes.success) {
          const enrichedExpiring = (expiringRes.data ?? []).map((batch) => ({
            ...batch,
            productName: productsMap.get(batch.productId)
          }))
          setExpiringBatches(enrichedExpiring)
        }
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
      code: '',
      expiryDate: ''
    })
    setDialogOpen(true)
  }

  const openEdit = (batch: Batch): void => {
    setEditing(batch)
    reset({
      productId: batch.productId,
      code: batch.code,
      expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : ''
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: BatchFormValues): Promise<void> => {
    try {
      const expiryDate = values.expiryDate ? new Date(values.expiryDate) : undefined
      const data = {
        ...values,
        expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : undefined
      }

      if (editing) {
        const response = await window.api.db.batches.update(editing.id, {
          code: data.code,
          expiryDate: data.expiryDate
        })
        if (response.success) {
          await loadData()
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan batch')
          return
        }
      } else {
        const response = await window.api.db.batches.create(data)
        if (response.success) {
          await loadData()
        } else {
          globalAlert.error(response.error ?? 'Gagal menyimpan batch')
          return
        }
      }
      closeDialog()
    } catch {
      globalAlert.error('Operasi gagal')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm('Apakah Anda yakin ingin menghapus batch ini?')
    if (!confirmed) return
    try {
      const response = await window.api.db.batches.delete(id)
      if (response.success) {
        await loadData()
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus batch')
      }
    } catch {
      globalAlert.error('Gagal menghapus batch')
    }
  }

  const isExpiringSoon = (expiryDate: Date | null): boolean => {
    if (!expiryDate) return false
    const dateValue = new Date(expiryDate).getTime()
    if (isNaN(dateValue)) return false
    const days = Math.floor((dateValue - Date.now()) / (1000 * 60 * 60 * 24))
    return days <= 30 && days >= 0
  }

  const isExpired = (expiryDate: Date | null): boolean => {
    if (!expiryDate) return false
    const dateValue = new Date(expiryDate)
    if (isNaN(dateValue.getTime())) return false
    return dateValue < new Date()
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A'
    const dateValue = new Date(date)
    if (isNaN(dateValue.getTime())) return 'Invalid Date'
    return dateValue.toLocaleDateString()
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
        <Typography variant="h4">Manajemen Batch</Typography>
        {hasPermission('inventory.batch.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Tambah Batch
          </Button>
        )}
      </Stack>

      {expiringBatches.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {expiringBatches.length} batch akan kadaluarsa dalam 30 hari
          </Typography>
          {expiringBatches.slice(0, 3).map((batch) => (
            <Typography key={batch.id} variant="body2">
              • {batch.productName} - {batch.code} (Kadaluarsa: {formatDate(batch.expiryDate)})
            </Typography>
          ))}
        </Alert>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell>Kode Batch</TableCell>
              <TableCell>Tanggal Kadaluarsa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.productName || batch.productId}</TableCell>
                <TableCell>{batch.code}</TableCell>
                <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                <TableCell>
                  {isExpired(batch.expiryDate) ? (
                    <Chip label="Kadaluarsa" color="error" size="small" />
                  ) : isExpiringSoon(batch.expiryDate) ? (
                    <Chip label="Segera Kadaluarsa" color="warning" size="small" />
                  ) : (
                    <Chip label="Valid" color="success" size="small" />
                  )}
                </TableCell>
                 <TableCell align="right">
                  {(hasPermission('inventory.batch.edit') || hasPermission('inventory.batch.delete')) && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {hasPermission('inventory.batch.edit') && (
                        <Tooltip title="Ubah Batch">
                          <IconButton size="small" onClick={() => openEdit(batch)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {hasPermission('inventory.batch.delete') && (
                        <Tooltip title="Hapus Batch">
                          <IconButton size="small" onClick={() => handleDelete(batch.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Tidak ada batch
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Ubah Batch' : 'Tambah Batch'}</DialogTitle>
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

            <TextField
              {...register('code')}
              label="Kode Batch"
              fullWidth
              margin="normal"
              error={!!errors.code}
              helperText={errors.code?.message}
            />

            <TextField
              {...register('expiryDate')}
              label="Tanggal Kadaluarsa"
              type="date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              error={!!errors.expiryDate}
              helperText={errors.expiryDate?.message}
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
