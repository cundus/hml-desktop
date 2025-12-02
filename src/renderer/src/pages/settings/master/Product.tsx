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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DescriptionIcon from '@mui/icons-material/Description'
import Menu from '@mui/material/Menu'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  cost: z.string().min(1, 'Harga pokok wajib diisi'),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  isService: z.boolean(),
  isActive: z.boolean()
})

export type ProductFormValues = z.infer<typeof productSchema>

export type Product = {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  categoryId: string | null
  supplierId: string | null
  isService: boolean
  isActive: boolean
  categoryName?: string
  supplierName?: string
}

type Category = {
  id: string
  name: string
}

type Supplier = {
  id: string
  name: string
}

type Uom = {
  id: string
  code: string
  name: string
}

export default function ProductPage(): React.JSX.Element {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [uoms, setUoms] = useState<Uom[]>([])

  // Excel import/export state
  const [excelMenuAnchor, setExcelMenuAnchor] = useState<null | HTMLElement>(null)
  const [excelLoading, setExcelLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info'
  }>({ open: false, message: '', severity: 'info' })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      unit: 'PCS',
      cost: '',
      categoryId: '',
      supplierId: '',
      isService: false,
      isActive: true
    }
  })

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const [productsRes, categoriesRes, suppliersRes, uomsRes] = await Promise.all([
          window.api.db.products.getAll(),
          window.api.db.categories.getAll(),
          window.api.db.suppliers.getAll(),
          window.api.db.uoms.getAll()
        ])

        if (
          productsRes.success &&
          categoriesRes.success &&
          suppliersRes.success &&
          uomsRes.success
        ) {
          const categoryList = categoriesRes.data ?? []
          const categoryMap = new Map(categoryList.map((c) => [c.id, c.name]))
          const supplierList = suppliersRes.data ?? []
          const supplierMap = new Map(supplierList.map((s) => [s.id, s.name]))
          const uomList = uomsRes.data ?? []
          setUoms(uomList)

          const products = (productsRes.data ?? []).map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            cost: p.cost,
            categoryId: p.categoryId,
            supplierId: p.supplierId,
            isService: p.isService ?? false,
            isActive: p.isActive,
            categoryName: p.categoryId ? (categoryMap.get(p.categoryId) ?? '') : '',
            supplierName: p.supplierId ? (supplierMap.get(p.supplierId) ?? '') : ''
          }))

          setItems(products)
          setCategories(categoryList)
          setSuppliers(supplierList)
        } else {
          setError(
            productsRes.error ??
              categoriesRes.error ??
              suppliersRes.error ??
              uomsRes.error ??
              'Gagal memuat produk'
          )
        }
      } catch {
        setError('Gagal memuat produk')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditing(null)
    reset({
      sku: '',
      name: '',
      unit: 'PCS',
      cost: '',
      categoryId: '',
      supplierId: '',
      isService: false,
      isActive: true
    })
    setDialogOpen(true)
  }

  const openEdit = (product: Product): void => {
    setEditing(product)
    reset({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      cost: product.cost,
      categoryId: product.categoryId ?? '',
      supplierId: product.supplierId ?? '',
      isService: product.isService,
      isActive: product.isActive
    })
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const onSubmit = async (values: ProductFormValues): Promise<void> => {
    console.log(values)

    try {
      const createPayload = {
        sku: values.sku,
        name: values.name,
        unit: values.unit,
        cost: values.cost,
        categoryId: values.categoryId || undefined,
        supplierId: values.supplierId || undefined,
        isService: values.isService,
        isActive: values.isActive
      }

      const updatePayload = {
        name: values.name,
        unit: values.unit,
        cost: values.cost,
        categoryId: values.categoryId || undefined,
        supplierId: values.supplierId || undefined,
        isService: values.isService,
        isActive: values.isActive
      }

      if (editing) {
        const response = await window.api.db.products.update(editing.id, updatePayload)
        if (response.success && response.data) {
          const updated = response.data
          const categoryName = updated.categoryId
            ? (categories.find((c) => c.id === updated.categoryId)?.name ?? '')
            : ''

          const supplierName = updated.supplierId
            ? (suppliers.find((s) => s.id === updated.supplierId)?.name ?? '')
            : ''

          setItems((prev) =>
            prev.map((p) =>
              p.id === editing.id
                ? {
                    id: updated.id,
                    sku: updated.sku,
                    name: updated.name,
                    unit: updated.unit,
                    cost: updated.cost,
                    categoryId: updated.categoryId,
                    supplierId: updated.supplierId,
                    isService: updated.isService ?? false,
                    isActive: updated.isActive,
                    categoryName,
                    supplierName
                  }
                : p
            )
          )
        } else {
          setError(response.error ?? 'Gagal menyimpan produk')
          return
        }
      } else {
        const response = await window.api.db.products.create(createPayload)
        if (response.success && response.data) {
          const created = response.data
          const categoryName = created.categoryId
            ? (categories.find((c) => c.id === created.categoryId)?.name ?? '')
            : ''

          const supplierName = created.supplierId
            ? (suppliers.find((s) => s.id === created.supplierId)?.name ?? '')
            : ''

          setItems((prev) => [
            ...prev,
            {
              id: created.id,
              sku: created.sku,
              name: created.name,
              unit: created.unit,
              cost: created.cost,
              categoryId: created.categoryId,
              supplierId: created.supplierId,
              isService: created.isService ?? false,
              isActive: created.isActive,
              categoryName,
              supplierName
            }
          ])
        } else {
          setError(response.error ?? 'Gagal menyimpan produk')
          return
        }
      }
      setDialogOpen(false)
    } catch {
      setError('Gagal menyimpan produk')
    }
  }

  const handleDelete = async (product: Product): Promise<void> => {
    try {
      if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return
      const response = await window.api.db.products.delete(product.id)
      if (!response.success) {
        setError(response.error ?? 'Gagal menghapus produk')
        return
      }
    } catch {
      setError('Gagal menghapus produk')
    }
    setItems((prev) => prev.filter((p) => p.id !== product.id))
  }

  // Excel handlers
  const handleExcelMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setExcelMenuAnchor(event.currentTarget)
  }

  const handleExcelMenuClose = (): void => {
    setExcelMenuAnchor(null)
  }

  const handleExport = async (): Promise<void> => {
    handleExcelMenuClose()
    setExcelLoading(true)
    try {
      const response = await window.api.db.products.exportExcel()
      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || 'Export berhasil',
          severity: 'success'
        })
      } else {
        setSnackbar({
          open: true,
          message: response.error || 'Export gagal',
          severity: 'error'
        })
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Export gagal',
        severity: 'error'
      })
    } finally {
      setExcelLoading(false)
    }
  }

  const handleImport = async (): Promise<void> => {
    handleExcelMenuClose()
    setExcelLoading(true)
    try {
      const response = await window.api.db.products.importExcel()
      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || 'Import berhasil',
          severity: 'success'
        })
        // Reload products
        const productsRes = await window.api.db.products.getAll()
        if (productsRes.success) {
          const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
          const products = (productsRes.data ?? []).map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            cost: p.cost,
            categoryId: p.categoryId,
            isActive: p.isActive,
            categoryName: p.categoryId ? (categoryMap.get(p.categoryId) ?? '') : ''
          }))
          setItems(products)
        }
      } else {
        setSnackbar({
          open: true,
          message: response.error || 'Import gagal',
          severity: 'error'
        })
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Import gagal',
        severity: 'error'
      })
    } finally {
      setExcelLoading(false)
    }
  }

  const handleDownloadTemplate = async (): Promise<void> => {
    handleExcelMenuClose()
    setExcelLoading(true)
    try {
      const response = await window.api.db.products.downloadTemplate()
      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || 'Template berhasil diunduh',
          severity: 'success'
        })
      } else {
        setSnackbar({
          open: true,
          message: response.error || 'Gagal mengunduh template',
          severity: 'error'
        })
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Gagal mengunduh template',
        severity: 'error'
      })
    } finally {
      setExcelLoading(false)
    }
  }

  const handleSnackbarClose = (): void => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Master Produk</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleExcelMenuOpen}
            disabled={loading || excelLoading}
            startIcon={excelLoading ? <CircularProgress size={16} /> : <DescriptionIcon />}
          >
            Excel
          </Button>
          <Menu
            anchorEl={excelMenuAnchor}
            open={Boolean(excelMenuAnchor)}
            onClose={handleExcelMenuClose}
          >
            <MenuItem onClick={handleExport}>
              <FileDownloadIcon sx={{ mr: 1 }} fontSize="small" />
              Export Data
            </MenuItem>
            <MenuItem onClick={handleImport}>
              <FileUploadIcon sx={{ mr: 1 }} fontSize="small" />
              Import Data
            </MenuItem>
            <MenuItem onClick={handleDownloadTemplate}>
              <DescriptionIcon sx={{ mr: 1 }} fontSize="small" />
              Download Template
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={loading}
          >
            Tambah Produk
          </Button>
        </Stack>
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
                <TableCell>SKU</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Tipe</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Tidak ada produk
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>{product.supplierName}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={product.isService ? 'Jasa' : 'Produk'}
                        color={product.isService ? 'info' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={product.isActive ? 'Aktif' : 'Nonaktif'}
                        color={product.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(product)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => void handleDelete(product)}
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
        <DialogTitle>{editing ? 'Ubah Produk' : 'Buat Produk'}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="product-form"
            onSubmit={handleSubmit(onSubmit, console.log)}
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              label="SKU"
              fullWidth
              {...register('sku')}
              error={!!errors.sku}
              helperText={errors.sku?.message}
              disabled={!!editing}
            />
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
              label="Satuan"
              fullWidth
              select
              {...register('unit')}
              error={!!errors.unit}
              helperText={errors.unit?.message}
            >
              {uoms.length === 0 ? (
                <MenuItem value="PCS">PCS (Default)</MenuItem>
              ) : (
                uoms.map((uom) => (
                  <MenuItem key={uom.id} value={uom.code}>
                    {uom.code} - {uom.name}
                  </MenuItem>
                ))
              )}
            </TextField>
            <TextField
              margin="normal"
              label="Harga Pokok"
              fullWidth
              type="number"
              {...register('cost')}
              error={!!errors.cost}
              helperText={errors.cost?.message}
            />
            <TextField
              margin="normal"
              label="Kategori Produk"
              fullWidth
              select
              {...register('categoryId')}
              error={!!errors.categoryId}
              helperText={errors.categoryId?.message}
            >
              <MenuItem value="">Tanpa Kategori</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="normal"
              label="Supplier"
              fullWidth
              select
              {...register('supplierId')}
              error={!!errors.supplierId}
              helperText={errors.supplierId?.message}
            >
              <MenuItem value="">Tanpa Supplier</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Checkbox {...register('isService')} />}
              label="Jasa (bukan produk fisik)"
            />
            <FormControlLabel
              control={<Checkbox {...register('isActive')} defaultChecked />}
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Batal</Button>
          <Button type="submit" form="product-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
