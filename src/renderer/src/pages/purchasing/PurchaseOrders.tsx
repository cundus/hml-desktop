import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { globalAlert } from '../../lib/globalAlert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FilterListIcon from '@mui/icons-material/FilterList'

type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

interface PurchaseOrder {
  id: string
  code: string
  supplierId: string
  supplierName?: string
  storeId: string
  storeName?: string
  status: PurchaseOrderStatus
  total: string
  createdAt: Date
  items?: Array<{
    productId: string
    quantity: number
    cost: string
  }>
}

interface Supplier {
  id: string
  name: string
}

interface Store {
  id: string
  name: string
  code: string
}

export default function PurchaseOrdersPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [items, setItems] = useState<PurchaseOrder[]>([])
  const [filteredItems, setFilteredItems] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    supplierId: '',
    storeId: '',
    status: ''
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

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

      const [posRes, suppliersRes, storesRes] = await Promise.all([
        window.api.db.purchaseOrders.getAll(),
        window.api.db.suppliers.getAll(),
        window.api.db.stores.getAll()
      ])

      if (posRes.success && suppliersRes.success && storesRes.success) {
        const suppliersMap = new Map(suppliersRes.data?.map((s) => [s.id, s.name]))
        const storesMap = new Map(storesRes.data?.map((s) => [s.id, s.name]))

        const enrichedPOs = (posRes.data ?? []).map((po) => ({
          ...po,
          supplierName: suppliersMap.get(po.supplierId),
          storeName: storesMap.get(po.storeId)
        }))

        setItems(enrichedPOs)
        setSuppliers(suppliersRes.data ?? [])
        setStores(storesRes.data ?? [])
      } else {
        setError('Gagal memuat data')
      }
    } catch {
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (): void => {
    let filtered = [...items]

    if (filters.supplierId) {
      filtered = filtered.filter((po) => po.supplierId === filters.supplierId)
    }

    if (filters.storeId) {
      filtered = filtered.filter((po) => po.storeId === filters.storeId)
    }

    if (filters.status) {
      filtered = filtered.filter((po) => po.status === filters.status)
    }

    setFilteredItems(filtered)
  }

  const clearFilters = (): void => {
    setFilters({
      supplierId: '',
      storeId: '',
      status: ''
    })
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, po: PurchaseOrder): void => {
    setAnchorEl(event.currentTarget)
    setSelectedPO(po)
  }

  const handleMenuClose = (): void => {
    setAnchorEl(null)
    setSelectedPO(null)
  }

  const handleStatusChange = async (status: PurchaseOrderStatus): Promise<void> => {
    if (!selectedPO) return

    try {
      const response = await window.api.db.purchaseOrders.update(selectedPO.id, {
        status,
        total: selectedPO.total
      })

      if (response.success) {
        await loadData()
        handleMenuClose()
      } else {
        globalAlert.error(response.error ?? 'Gagal memperbarui status')
      }
    } catch {
      globalAlert.error('Gagal memperbarui status')
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await globalAlert.confirm(
      'Apakah Anda yakin ingin menghapus pesanan pembelian ini?'
    )
    if (!confirmed) return

    try {
      const response = await window.api.db.purchaseOrders.delete(id)
      if (response.success) {
        await loadData()
      } else {
        globalAlert.error(response.error ?? 'Gagal menghapus')
      }
    } catch {
      globalAlert.error('Gagal menghapus')
    }
  }

  const getStatusColor = (
    status: PurchaseOrderStatus
  ): 'default' | 'primary' | 'success' | 'error' => {
    switch (status) {
      case 'DRAFT':
        return 'default'
      case 'ORDERED':
        return 'primary'
      case 'RECEIVED':
        return 'success'
      case 'CANCELLED':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString()
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
        <Typography variant="h4">Pesanan Pembelian</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            Filter
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/purchasing/order-form')}
          >
            Buat PO
          </Button>
        </Stack>
      </Stack>

      {filterOpen && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" mb={2}>
            Filter
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              select
              label="Supplier"
              value={filters.supplierId}
              onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Semua Supplier</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Toko"
              value={filters.storeId}
              onChange={(e) => setFilters({ ...filters, storeId: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Semua Toko</MenuItem>
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Semua Status</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="ORDERED">Dipesan</MenuItem>
              <MenuItem value="RECEIVED">Diterima</MenuItem>
              <MenuItem value="CANCELLED">Dibatalkan</MenuItem>
            </TextField>

            <Button variant="outlined" onClick={clearFilters}>
              Hapus Filter
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kode PO</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((po) => (
              <TableRow key={po.id}>
                <TableCell>{po.code}</TableCell>
                <TableCell>{formatDate(po.createdAt)}</TableCell>
                <TableCell>{po.supplierName || po.supplierId}</TableCell>
                <TableCell>{po.storeName || po.storeId}</TableCell>
                <TableCell>
                  <Chip label={po.status} color={getStatusColor(po.status)} size="small" />
                </TableCell>
                <TableCell align="right">{po.total}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/purchasing/order-form?id=${po.id}`)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, po)}>
                    <MoreVertIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(po.id)}
                    disabled={po.status === 'RECEIVED'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Tidak ada pesanan pembelian
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Status Change Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleStatusChange('DRAFT')}>Tandai sebagai Draft</MenuItem>
        <MenuItem onClick={() => handleStatusChange('ORDERED')}>Tandai sebagai Dipesan</MenuItem>
        <MenuItem onClick={() => handleStatusChange('RECEIVED')}>Tandai sebagai Diterima</MenuItem>
        <MenuItem onClick={() => handleStatusChange('CANCELLED')}>
          Tandai sebagai Dibatalkan
        </MenuItem>
      </Menu>
    </Box>
  )
}
