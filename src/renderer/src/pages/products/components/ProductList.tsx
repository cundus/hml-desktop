import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import InventoryIcon from '@mui/icons-material/Inventory'
import UploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import { DataGrid, GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid'
import ProductImportDialog from './ProductImportDialog'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  cost?: string
  weight?: string
  categoryId?: string
}

interface Category {
  id: string
  name: string
}

interface ProductListProps {
  products: Product[]
  loading: boolean
  selectedProductId: string | null
  onSelectProduct: (id: string | null) => void
  onRefresh: () => void
}

export default function ProductList({
  products,
  loading,
  selectedProductId,
  onSelectProduct,
  onRefresh
}: ProductListProps): React.JSX.Element {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load categories
  useEffect(() => {
    const loadCategories = async (): Promise<void> => {
      try {
        const res = await window.api.db.categories.getAll()
        setCategories(res.data ?? [])
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    void loadCategories()
  }, [])

  // Create lookups
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]))
  }, [categories])

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = products

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      )
    }

    if (categoryFilter) {
      result = result.filter((p) => p.categoryId === categoryFilter)
    }

    return result
  }, [products, search, categoryFilter])

  const handleAddProduct = (): void => {
    navigate('/master-product')
  }

  const handleImportSuccess = (): void => {
    onRefresh()
  }

  const handleRowClick = (params: { row: Product }): void => {
    onSelectProduct(params.row.id)
  }

  const handleDeleteSelected = async (): Promise<void> => {
    const selectedIds = Array.from(selectionModel.ids) as string[]
    if (selectedIds.length === 0) return

    setDeleting(true)
    try {
      const res = await window.api.db.products.deleteBatch(selectedIds)
      if (res.success) {
        setSelectionModel({ type: 'include', ids: new Set() })
        setDeleteDialogOpen(false)
        onRefresh()
      } else {
        console.error('Failed to delete products:', res.error)
      }
    } catch (error) {
      console.error('Failed to delete products', error)
    } finally {
      setDeleting(false)
    }
  }

  // Column definitions
  const columns: GridColDef[] = [
    {
      field: 'sku',
      headerName: 'SKU',
      width: 120,
      renderCell: (params: GridRenderCellParams<Product>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography fontWeight={600}>{params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'name',
      headerName: 'Nama Produk',
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<Product>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography noWrap>{params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'categoryId',
      headerName: 'Kategori',
      flex: 1,
      valueGetter: (_, row) => categoryMap.get(row.categoryId) || '-',
      renderCell: (params: GridRenderCellParams<Product>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography noWrap>{params.value}</Typography>
        </Box>
      )
    },
    // {
    //   field: 'cost',
    //   headerName: 'Modal',
    //   width: 110,
    //   renderCell: (params: GridRenderCellParams<Product>) => (
    //     <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
    //       <Typography>
    //         {params.value
    //           ? Number(params.value).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    //           : '-'}
    //       </Typography>
    //     </Box>
    //   )
    // },
    {
      field: 'weight',
      headerName: 'Berat (g)',
      width: 90,
      renderCell: (params: GridRenderCellParams<Product>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography>{params.value ? `${params.value}g` : '-'}</Typography>
        </Box>
      )
    },
    {
      field: 'unit',
      headerName: 'Satuan',
      width: 90,
      renderCell: (params: GridRenderCellParams<Product>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={params.value} size="small" variant="outlined" />
        </Box>
      )
    }
  ]

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Cari SKU / nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 150 }}
          label="Kategori"
        >
          <MenuItem value="">Semua</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          size="small"
          onClick={onRefresh}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          <RefreshIcon fontSize="small" />
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<InventoryIcon />}
          onClick={() => navigate('/inventory')}
        >
          Inventori
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import
        </Button>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddProduct}>
          Tambah Produk
        </Button>
      </Stack>

      {/* Selection Actions */}
      {selectionModel.ids.size > 0 && (
        <Stack direction="row" spacing={1} mb={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {selectionModel.ids.size} produk dipilih
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Hapus Terpilih
          </Button>
        </Stack>
      )}

      {/* Count */}
      <Typography variant="caption" color="text.secondary" mb={1}>
        {filteredProducts.length} produk ditemukan
      </Typography>

      {/* DataGrid */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={filteredProducts}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
            onRowClick={handleRowClick}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
            getRowClassName={(params) =>
              params.row.id === selectedProductId ? 'Mui-selected' : ''
            }
            sx={{
              height: '100%',
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
              '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12) !important'
              },
              '& .Mui-selected:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.2) !important'
              }
            }}
          />
        )}
      </Box>

      {/* Import Dialog */}
      <ProductImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Hapus Produk</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apakah Anda yakin ingin menghapus {selectionModel.ids.size} produk yang dipilih? Tindakan ini
            tidak dapat dibatalkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Batal
          </Button>
          <Button
            onClick={() => void handleDeleteSelected()}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Menghapus...' : 'Hapus'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
