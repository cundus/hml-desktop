import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { globalAlert } from '../../lib/globalAlert'
import useAuth from '../../hooks/useAuth'

type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

interface Product {
  id: string
  name: string
  sku: string
  cost: string
  unit: string
  weight: string
}

interface Uom {
  id: string
  code: string
  name: string
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

interface POItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  cost: number
  subtotal: number
  unit: string
  weight: number // Total weight for this item (unit weight * quantity)
}

export default function PurchaseOrderFormPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { hasPermission, userName } = useAuth()
  const [searchParams] = useSearchParams()
  const poId = searchParams.get('id')

  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [uoms, setUoms] = useState<Uom[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [code, setCode] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [status, setStatus] = useState<PurchaseOrderStatus>('DRAFT')
  const [items, setItems] = useState<POItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)

      const [productsRes, suppliersRes, storesRes, uomsRes] = await Promise.all([
        window.api.db.products.getAll(),
        window.api.db.suppliers.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.uoms.getAll()
      ])

      if (productsRes.success && suppliersRes.success && storesRes.success && uomsRes.success) {
        setProducts(productsRes.data ?? [])
        setSuppliers(suppliersRes.data ?? [])
        setStores(storesRes.data ?? [])
        setUoms(uomsRes.data ?? [])

        // Auto-generate code if new PO
        if (!poId) {
          // We will generate the code when store is selected or on load if store is already there
          // For now, let's keep it empty or default until store is selected
        } else {
          // Load existing PO
          await loadPurchaseOrder(poId, productsRes.data ?? [])
        }
      }
    } catch (err) {
      console.error('Gagal memuat data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPurchaseOrder = async (id: string, currentProducts: Product[]): Promise<void> => {
    try {
      const response = await window.api.db.purchaseOrders.getById(id)
      if (response.success && response.data) {
        const po = response.data
        setCode(po.code)
        setSupplierId(po.supplierId)
        setStoreId(po.storeId)
        setStatus(po.status)

        // Load items
        if (po.items) {
          const productsMap = new Map(currentProducts.map((p) => [p.id, p]))
          const loadedItems = po.items.map((item) => {
            const product = productsMap.get(item.productId)
            const cost = parseFloat(item.cost)
            const unitWeight = parseFloat(product?.weight || '0')
            return {
              productId: item.productId,
              productName: product?.name || 'Unknown',
              sku: product?.sku || '',
              quantity: item.quantity,
              cost,
              subtotal: item.quantity * cost,
              unit: item.unit || product?.unit || 'PCS',
              weight: item.quantity * unitWeight
            }
          })
          setItems(loadedItems)
        }
      }
    } catch (err) {
      console.error('Failed to load purchase order', err)
    }
  }

  const addItem = (): void => {
    if (!selectedProduct) {
      globalAlert.warning('Silakan pilih produk')
      return
    }

    // Check if product already in list
    const existingIndex = items.findIndex((item) => item.productId === selectedProduct.id)

    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...items]
      newItems[existingIndex].quantity += 1
      newItems[existingIndex].subtotal =
        newItems[existingIndex].quantity * newItems[existingIndex].cost
      const product = products.find(p => p.id === selectedProduct.id)
      const unitWeight = parseFloat(product?.weight || '0')
      newItems[existingIndex].weight = newItems[existingIndex].quantity * unitWeight
      setItems(newItems)
    } else {
      // Add new item
      const cost = parseFloat(selectedProduct.cost)
      const unitWeight = parseFloat(selectedProduct.weight || '0')
      const newItem: POItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: 1,
        cost,
        subtotal: cost,
        unit: selectedProduct.unit || 'PCS',
        weight: unitWeight
      }
      setItems([...items, newItem])
    }

    setSelectedProduct(null)
  }

  const updateQuantity = (index: number, quantity: number): void => {
    if (quantity <= 0) {
      removeItem(index)
      return
    }

    const newItems = [...items]
    newItems[index].quantity = quantity
    newItems[index].subtotal = quantity * newItems[index].cost
    const product = products.find(p => p.id === newItems[index].productId)
    const unitWeight = parseFloat(product?.weight || '0')
    newItems[index].weight = quantity * unitWeight
    setItems(newItems)
  }

  const updateUnit = (index: number, unit: string): void => {
    const newItems = [...items]
    newItems[index].unit = unit
    setItems(newItems)
  }

  const removeItem = (index: number): void => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const calculateTotalWeight = (): number => {
    return items.reduce((sum, item) => sum + item.weight, 0)
  }

  const generatePOCode = (storeId: string): void => {
    if (poId) return // Don't regenerate for existing PO

    const store = stores.find((s) => s.id === storeId)
    if (!store) return

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const userPart = (userName || 'ADMIN').toUpperCase().replace(/\s+/g, '_')
    const storePart = store.name.toUpperCase().replace(/\s+/g, '_')

    setCode(`${userPart}-${dateStr}-${storePart}`)
  }

  const handleSave = async (saveStatus: PurchaseOrderStatus): Promise<void> => {
    if (!supplierId || !storeId) {
      globalAlert.warning('Silakan isi semua field yang diperlukan')
      return
    }

    if (items.length === 0) {
      globalAlert.warning('Silakan tambahkan minimal satu item')
      return
    }

    try {
      setSaving(true)

      const total = calculateTotal()
      const poData = {
        code,
        supplierId,
        storeId,
        status: saveStatus,
        total: total.toFixed(2),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          cost: item.cost.toFixed(2),
          unit: item.unit
        }))
      }

      let response
      if (poId) {
        response = await window.api.db.purchaseOrders.update(poId, {
          status: saveStatus,
          total: total.toFixed(2),
          items: poData.items
        })
      } else {
        response = await window.api.db.purchaseOrders.create(poData)
      }

      if (response.success) {
        globalAlert.success('Pesanan pembelian berhasil disimpan!')
        navigate('/purchasing/orders')
      } else {
        globalAlert.error(response.error || 'Gagal menyimpan pesanan pembelian')
      }
    } catch (err) {
      globalAlert.error('Gagal menyimpan pesanan pembelian')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleReceive = async (): Promise<void> => {
    const confirmed = await globalAlert.confirm(
      'Tandai pesanan pembelian ini sebagai diterima? Ini akan memperbarui inventori.'
    )
    if (!confirmed) return

    try {
      setSaving(true)

      // Call backend to receive order
      const response = await window.api.db.purchaseOrders.receive(poId!)

      if (response.success) {
        globalAlert.success('Pesanan pembelian diterima! Inventori diperbarui.')
        navigate('/purchasing/orders')
      } else {
        globalAlert.error(response.error || 'Gagal menerima pesanan pembelian')
      }
    } catch (err) {
      globalAlert.error('Gagal menerima pesanan pembelian')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/purchasing/orders')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{poId ? 'Ubah' : 'Buat'} Pesanan Pembelian</Typography>
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detail PO
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Kode PO"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
            required
            disabled={!!poId}
          />

          <TextField
            select
            label="Supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            fullWidth
            required
            disabled={!!poId}
          >
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Toko"
            value={storeId}
            onChange={(e) => {
              const newStoreId = e.target.value
              setStoreId(newStoreId)
              generatePOCode(newStoreId)
            }}
            fullWidth
            required
            disabled={!!poId}
          >
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name} ({store.code})
              </MenuItem>
            ))}
          </TextField>

          {poId && (
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
              fullWidth
            >
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="ORDERED">Ordered</MenuItem>
              <MenuItem value="RECEIVED">Received</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Item
        </Typography>

        <Stack direction="row" spacing={2} mb={3}>
          <Autocomplete
            options={products}
            getOptionLabel={(option) => `${option.name} (${option.sku})`}
            value={selectedProduct}
            onChange={(_, newValue) => setSelectedProduct(newValue)}
            renderInput={(params) => <TextField {...params} label="Cari Produk..." />}
            sx={{ flex: 1 }}
            disabled={status === 'RECEIVED'}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addItem}
            disabled={!selectedProduct || status === 'RECEIVED'}
          >
            Tambah Item
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell align="right">Jumlah</TableCell>
              <TableCell align="right">Satuan</TableCell>
              <TableCell align="right">Harga Beli</TableCell>
              <TableCell align="right">Berat (kg)</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2">{item.productName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.sku}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                    size="small"
                    inputProps={{ min: 1 }}
                    disabled={status === 'RECEIVED'}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    select
                    value={item.unit}
                    onChange={(e) => updateUnit(index, e.target.value)}
                    size="small"
                    disabled={status === 'RECEIVED'}
                    sx={{ width: 100 }}
                  >
                    {uoms.map((uom) => (
                      <MenuItem key={uom.id} value={uom.code}>
                        {uom.code}
                      </MenuItem>
                    ))}
                    {/* Ensure current unit is visible even if not in master */}
                    {!uoms.find((u) => u.code === item.unit) && (
                      <MenuItem value={item.unit}>{item.unit}</MenuItem>
                    )}
                  </TextField>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={item.cost}
                    onChange={(e) => {
                      const newItems = [...items]
                      const newCost = parseFloat(e.target.value) || 0
                      newItems[index].cost = newCost
                      newItems[index].subtotal = newItems[index].quantity * newCost
                      setItems(newItems)
                    }}
                    size="small"
                    inputProps={{ min: 0 }}
                    disabled={status === 'RECEIVED' || !hasPermission('purchasing.order.edit-cost')}
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell align="right">{item.weight.toFixed(2)}</TableCell>
                <TableCell align="right">{item.subtotal.toLocaleString('id-ID')}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => removeItem(index)}
                    disabled={status === 'RECEIVED'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Belum ada item
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1} alignItems="flex-end" mt={2}>
          <Stack direction="row" spacing={2}>
            <Typography variant="body1">Total Berat:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {calculateTotalWeight().toFixed(2)} kg
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" color="primary">
              {calculateTotal().toFixed(2)}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate('/purchasing/orders')}>
            Batal
          </Button>
          {status !== 'RECEIVED' && (
            <>
              {((!poId && hasPermission('purchasing.order.create')) ||
                (poId && hasPermission('purchasing.order.edit'))) && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSave('DRAFT')}
                    disabled={saving}
                  >
                    Simpan sebagai Draft
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSave('ORDERED')}
                    disabled={saving}
                  >
                    {saving ? 'Menyimpan...' : 'Kirim Pesanan'}
                  </Button>
                </>
              )}
            </>
          )}
          {status === 'ORDERED' && hasPermission('purchasing.order.edit') && (
            <Button variant="contained" color="success" onClick={handleReceive} disabled={saving}>
              {saving ? 'Memproses...' : 'Terima Barang'}
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
