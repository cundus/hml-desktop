import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import InventoryIcon from '@mui/icons-material/Inventory'
import UploadIcon from '@mui/icons-material/CloudUpload'
import ProductImportDialog from './ProductImportDialog'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
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

const ITEMS_PER_PAGE = 25

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
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [importDialogOpen, setImportDialogOpen] = useState(false)

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

  // Paginated products
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, page])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

  const handleAddProduct = (): void => {
    navigate('/master-product')
  }

  const handleImportSuccess = (): void => {
    onRefresh()
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: selectedProductId ? '1px solid' : 'none',
        borderColor: 'divider',
        pr: selectedProductId ? 1 : 0
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} mb={2} alignItems="center">
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
          sx={{ flex: 1 }}
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
          sx={{ mr: 1 }}
        >
          Inventori
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadIcon />}
          onClick={() => setImportDialogOpen(true)}
          sx={{ mr: 1 }}
        >
          Import
        </Button>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddProduct}>
          Tambah Produk
        </Button>
      </Stack>

      {/* Count */}
      <Typography variant="caption" color="text.secondary" mb={1}>
        {filteredProducts.length} produk ditemukan
      </Typography>

      {/* Table List */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : filteredProducts.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Tidak ada produk
          </Typography>
        ) : (
          <TableContainer>
            <Table stickyHeader size="small" padding="normal">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Nama Produk</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Satuan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const isSelected = product.id === selectedProductId
                  return (
                    <TableRow
                      key={product.id}
                      hover
                      onClick={() => onSelectProduct(product.id)}
                      selected={isSelected}
                      sx={{
                        cursor: 'pointer',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(25, 118, 210, 0.12) !important'
                        },
                        '&.Mui-selected:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.2) !important'
                        }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        {product.categoryId ? categoryMap.get(product.categoryId) || '-' : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip label={product.unit} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            size="small"
            color="primary"
          />
        </Box>
      )}

      <ProductImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </Box>
  )
}
