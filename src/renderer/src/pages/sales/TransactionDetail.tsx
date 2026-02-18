import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PrintIcon from '@mui/icons-material/Print'
import SaveIcon from '@mui/icons-material/Save'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CurrencyInput from '../../components/CurrencyInput'
import Kbd from '../../components/Kbd'
import ProductSelectModal, {
  type ProductSelectResult,
  type ProductForSelection
} from './components/ProductSelectModal'
import DeliveryOrderModal from './components/DeliveryOrderModal'
import { globalAlert } from '../../lib/globalAlert'
import { formatCurrency } from '../../utils/currency'
import ReturnTransactionDialog from './components/ReturnTransactionDialog'
import { useAuth } from '../../contexts/AuthContext'

interface TransactionItem {
  id: string
  productId: string
  productName?: string
  productSku?: string
  quantity: number
  displayQuantity?: number
  uomCode?: string
  price: string
  weight?: number
  conversionFactor?: number
}

interface Transaction {
  id: string
  code: string
  storeId: string
  storeName?: string
  subtotal: string
  discount: string
  tax: string
  total: string
  paymentMethod: string
  paymentDeadline: Date | null
  receiptPrinted: boolean
  customerId: string | null
  customerName?: string
  userId: string | null
  userName?: string
  createdAt: Date
  updatedAt: Date
  items?: TransactionItem[]
}

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  weight?: string
}

interface Customer {
  id: string
  name: string
  code: string
  address?: string
}

export default function TransactionDetailPage(): React.JSX.Element {
  const { transactionId } = useParams<{ transactionId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Edit state
  const [editItems, setEditItems] = useState<TransactionItem[]>([])
  const [editDiscount, setEditDiscount] = useState(0)
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null)

  // Reference data
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map())
  const [productSelectModalOpen, setProductSelectModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [modalProduct, setModalProduct] = useState<ProductForSelection | null>(null)

  const [deliveryOrderModalOpen, setDeliveryOrderModalOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returns, setReturns] = useState<any[]>([])

  // Profit Detail State (Admin/Owner)
  const { hasPermission } = useAuth()
  const [profitDetail, setProfitDetail] = useState<any[]>([])
  const canViewProfit = hasPermission('sales.transaction.view-profit')

  useEffect(() => {
    if (transactionId && canViewProfit) {
      window.api.db.transactions.getProfitDetail(transactionId)
        .then(res => {
          if (res.success && res.data) {
            setProfitDetail(res.data)
          }
        })
        .catch(err => console.error('Failed to load profit detail', err))
    }
  }, [transactionId, canViewProfit])

  useEffect(() => {
    if (transactionId) {
      void loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancelEdit()
        } else {
          navigate('/sales/reports')
        }
      } else if (e.key === 'e' && !isEditing && transaction) {
        e.preventDefault()
        handleStartEdit()
      } else if (e.key === 'p' && !isEditing && transaction) {
        e.preventDefault()
        void handlePrint()
      } else if (e.key === 'a' && isEditing) {
        e.preventDefault()
        handleAddItem()
      } else if (e.ctrlKey && e.key === 's' && isEditing) {
        e.preventDefault()
        void handleSave()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditing, transaction, saving]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)

      const [txnRes, productsRes, customersRes, storesRes, usersRes] = await Promise.all([
        window.api.db.transactions.getById(transactionId!),
        window.api.db.products.getAll(),
        window.api.db.customers.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.customers.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.users.getAll(),
        window.api.db.returns.getByTransactionId(transactionId!)
      ])

      console.log(txnRes)

      if (!txnRes.success || !txnRes.data) {
        globalAlert.error('Transaksi tidak ditemukan')
        navigate('/sales/reports')
        return
      }

      const prods = productsRes.data ?? []
      const custs = customersRes.data ?? []
      const stores = storesRes.data ?? []
      const users = usersRes.data ?? []

      setProducts(
        prods.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit ?? 'PCS',
          cost: p.cost ?? '0'
        }))
      )
      setCustomers(
        custs.map((c) => ({ id: c.id, name: c.name, code: c.code ?? '', address: c.address ?? '' }))
      )

      const prodMap = new Map<string, Product>(
        prods.map((p) => [
          p.id,
          {
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit ?? 'PCS',
            cost: p.cost ?? '0'
          }
        ])
      )
      setProductMap(prodMap)

      const storeMap = new Map(stores.map((s) => [s.id, s.name]))
      const userMap = new Map(users.map((u) => [u.id, u.name]))
      const custMap = new Map(custs.map((c) => [c.id, c.name]))

      const txn = txnRes.data
      const returnList = txnRes.data
        ? (await window.api.db.returns.getByTransactionId(txn.id)).data
        : []
      if (Array.isArray(returnList)) setReturns(returnList)

      const enrichedItems = (txn.items ?? []).map((item) => {
        const product = prods.find((p) => p.id === item.productId)
        const conversion = (item.displayQuantity && item.displayQuantity > 0) 
          ? (item.quantity / item.displayQuantity) 
          : 1
        return {
          ...item,
          productName: product?.name ?? 'Unknown',
          productSku: product?.sku ?? '-',
          displayQuantity: item.displayQuantity ?? item.quantity,
          weight: item.weight || Number(product?.weight ?? 0),
          conversionFactor: conversion
        }
      })

      setTransaction({
        ...txn,
        storeName: storeMap.get(txn.storeId) ?? txn.storeId,
        customerName: txn.customerId ? (custMap.get(txn.customerId) ?? '-') : '-',
        userName: txn.userId ? (userMap.get(txn.userId) ?? '-') : '-',
        items: enrichedItems
      })

      // Initialize edit state
      setEditItems(enrichedItems)
      setEditDiscount(Number(txn.discount) || 0)
      setEditPaymentMethod(txn.paymentMethod ?? 'cash')
      setEditCustomerId(txn.customerId)
    } catch (error) {
      console.error('Failed to load transaction', error)
      globalAlert.error('Gagal memuat data transaksi')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (): void => {
    if (!transaction) return
    setEditItems([...(transaction.items ?? [])])
    setEditDiscount(Number(transaction.discount) || 0)
    setEditPaymentMethod(transaction.paymentMethod ?? 'cash')
    setEditCustomerId(transaction.customerId)
    setIsEditing(true)
  }

  const handleCancelEdit = (): void => {
    setIsEditing(false)
  }

  const handleDelete = async (): Promise<void> => {
    if (!transaction) return

    const confirmed = await globalAlert.confirmWithOptions({
      title: 'Hapus Transaksi',
      message: `Apakah Anda yakin ingin menghapus transaksi ${transaction.code}?\n\nStock produk akan dikembalikan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'error'
    })
    if (!confirmed) return

    try {
      setDeleting(true)
      const res = await window.api.db.transactions.delete(transaction.id)
      if (res.success) {
        globalAlert.success('Transaksi berhasil dihapus')
        navigate('/sales/reports')
      } else {
        globalAlert.error(res.error ?? 'Gagal menghapus transaksi')
      }
    } catch (error) {
      console.error('Failed to delete transaction', error)
      globalAlert.error('Gagal menghapus transaksi')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!transaction) return

    if (editItems.length === 0) {
      globalAlert.error('Transaksi harus memiliki minimal satu item')
      return
    }

    for (const item of editItems) {
      if (!item.productId) {
        globalAlert.error('Setiap item harus memiliki produk')
        return
      }
      if (item.quantity <= 0) {
        globalAlert.error('Jumlah item minimal 1')
        return
      }
      if (Number(item.price) < 0) {
        globalAlert.error('Harga tidak boleh negatif')
        return
      }
    }

    const subtotal = editItems.reduce((sum, item) => {
      // Calculate based on display quantity if available, otherwise quantity
      console.log('ITEM', item)

      let qty = 0
      if (!item.displayQuantity) qty = item.quantity
      else if (item.displayQuantity === item.quantity) qty = item.quantity
      else qty = item.displayQuantity

      return sum + Number(item.price) * qty
    }, 0)

    const total = subtotal - editDiscount

    if (total < 0) {
      globalAlert.error('Total tidak boleh negatif')
      return
    }

    try {
      setSaving(true)

      const res = await window.api.db.transactions.update(transaction.id, {
        subtotal: subtotal.toString(),
        discount: editDiscount.toString(),
        total: total.toString(),
        paymentMethod: editPaymentMethod,
        customerId: editCustomerId,
        items: editItems.map((item) => {
          // If we have conversionFactor, use it. Otherwise fallback to item.quantity (assumed base)
          const baseQuantity = item.conversionFactor 
            ? item.quantity * item.conversionFactor 
            : item.quantity

          return {
            id: item.id.startsWith('new-') ? undefined : item.id,
            productId: item.productId,
            quantity: baseQuantity,
            displayQuantity: item.quantity,
            uomCode: item.uomCode,
            price: item.price
          }
        })
      })

      if (res.success) {
        globalAlert.success('Transaksi berhasil diperbarui')
        setIsEditing(false)
        await loadData() // Reload to get fresh data
      } else {
        globalAlert.error(res.error ?? 'Gagal menyimpan perubahan')
      }
    } catch (error) {
      console.error('Failed to save transaction', error)
      globalAlert.error('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async (): Promise<void> => {
    if (!transaction) return

    try {
      const res = await window.api.db.transactions.printReceipt(
        transaction as Parameters<typeof window.api.db.transactions.printReceipt>[0]
      )
      if (res.success) {
        globalAlert.success('Struk berhasil dicetak')
        await window.api.db.transactions.updateReceiptPrinted(transaction.id, true)
        await loadData()
      } else {
        globalAlert.error(res.error ?? 'Gagal mencetak struk')
      }
    } catch (error) {
      console.error('Failed to print receipt', error)
      globalAlert.error('Gagal mencetak struk')
    }
  }

  const handleAddItem = (): void => {
    setEditItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        productId: '',
        productName: '',
        productSku: '',
        quantity: 1,
        price: '0'
      }
    ])
  }

  const handleRemoveItem = (index: number): void => {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }



  const handleItemChange = (
    index: number,
    field: 'productId' | 'quantity' | 'price',
    value: string | number
  ): void => {
    setEditItems((prev) => {
      const newItems = [...prev]
      if (field === 'productId') {
        const product = productMap.get(value as string)
        newItems[index] = {
          ...newItems[index],
          productId: value as string,
          productName: product?.name ?? '',
          productSku: product?.sku ?? ''
        }
      } else if (field === 'quantity') {
        newItems[index] = { ...newItems[index], quantity: value as number }
      } else if (field === 'price') {
        newItems[index] = { ...newItems[index], price: value.toString() }
      }
      return newItems
    })
  }

  // Pre-process items for display in edit mode
  // The 'quantity' field in editItems will hold the DISPLAY QUANTITY for editing purposes
  useEffect(() => {
    if (isEditing && transaction?.items) {
      setEditItems(
        transaction.items.map((item) => ({
          ...item,
          quantity: item.displayQuantity ?? item.quantity
        }))
      )
    }
  }, [isEditing, transaction])

  const handleProductOptionsConfirm = (result: ProductSelectResult): void => {
    if (selectedItemIndex === null) return

    const { product, quantity, unitPrice } = result

    setEditItems((prev) => {
      const items = [...prev]
      const existing = items[selectedItemIndex]
      if (!existing) return prev

      items[selectedItemIndex] = {
        ...existing,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity, // This is unit quantity from modal
        displayQuantity: quantity,
        price: unitPrice.toString(),
        conversionFactor: result.selectedUom.conversionFactor,
        uomCode: result.selectedUom.code
      }

      return items
    })

    setProductSelectModalOpen(false)
    setSelectedItemIndex(null)
    setModalProduct(null)
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Tunai',
      card: 'Kartu',
      qris: 'QRIS',
      credit: 'Kredit'
    }
    return labels[method] ?? method
  }

  // Computed values for edit mode
  const editSubtotal = editItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const editTotal = editSubtotal - editDiscount

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (!transaction) {
    return (
      <Box p={3}>
        <Alert severity="error">Transaksi tidak ditemukan</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/sales/reports')}
          sx={{ mt: 2 }}
        >
          Kembali
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/sales/reports')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={600}>
            Detail Transaksi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {transaction.code}
          </Typography>
        </Box>
        {!isEditing && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
              Cetak Struk <Kbd keys={['P']} size="small" />
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setDeliveryOrderModalOpen(true)}
            >
              Cetak Surat Jalan
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={() => setReturnDialogOpen(true)}
            >
              Retur Barang
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleStartEdit}>
              Edit <Kbd keys={['E']} size="small" />
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </Stack>
        )}
        {isEditing && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleCancelEdit} disabled={saving}>
              Batal <Kbd keys={['Esc']} size="small" />
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || editItems.length === 0}
            >
              {saving ? 'Menyimpan...' : 'Simpan'} <Kbd keys={['Ctrl', 'S']} size="small" />
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Transaction Info */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informasi Transaksi
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Kode
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {transaction.code}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Tanggal
                </Typography>
                <Typography variant="body2">{formatDate(transaction.createdAt)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Toko
                </Typography>
                <Typography variant="body2">{transaction.storeName}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Kasir
                </Typography>
                <Typography variant="body2">{transaction.userId}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Status Cetak
                </Typography>
                <Chip
                  label={transaction.receiptPrinted ? 'Sudah dicetak' : 'Belum dicetak'}
                  size="small"
                  color={transaction.receiptPrinted ? 'success' : 'default'}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Pembayaran
            </Typography>
            <Stack spacing={1}>
              {isEditing ? (
                <>
                  <TextField
                    select
                    size="small"
                    label="Metode Pembayaran"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="cash">Tunai</MenuItem>
                    <MenuItem value="card">Kartu</MenuItem>
                    <MenuItem value="qris">QRIS</MenuItem>
                    <MenuItem value="credit">Kredit</MenuItem>
                  </TextField>
                  <Autocomplete
                    size="small"
                    options={customers}
                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                    value={customers.find((c) => c.id === editCustomerId) ?? null}
                    onChange={(_, newValue) => setEditCustomerId(newValue?.id ?? null)}
                    renderInput={(params) => <TextField {...params} label="Pelanggan (opsional)" />}
                  />
                </>
              ) : (
                <>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Metode
                    </Typography>
                    <Chip
                      label={getPaymentMethodLabel(transaction.paymentMethod)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Pelanggan
                    </Typography>
                    <Typography variant="body2">{transaction.customerName}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(isEditing ? editSubtotal : Number(transaction.subtotal))}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Diskon
                </Typography>
                {isEditing ? (
                  <CurrencyInput
                    size="small"
                    value={editDiscount}
                    onChange={(val) => setEditDiscount(val)}
                    sx={{ width: 150 }}
                  />
                ) : (
                  <Typography variant="body2" color="error">
                    -{formatCurrency(Number(transaction.discount))}
                  </Typography>
                )}
              </Box>
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body1" fontWeight={600}>
                  Total
                </Typography>
                <Typography variant="h6" color="primary" fontWeight={600}>
                  {formatCurrency(isEditing ? editTotal : Number(transaction.total))}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Items Table */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Item Transaksi</Typography>
          {isEditing && (
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddItem}>
              Tambah Item <Kbd keys={['A']} size="small" />
            </Button>
          )}
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={50}>#</TableCell>
              <TableCell>Produk</TableCell>
              <TableCell align="right" width={80}>
                Qty
              </TableCell>
              <TableCell align="center" width={80}>
                Satuan
              </TableCell>
              <TableCell align="right" width={130}>
                Harga
              </TableCell>
              <TableCell align="right" width={130}>
                Subtotal
              </TableCell>
              {isEditing && <TableCell width={60} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {(isEditing ? editItems : (transaction.items ?? [])).map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Autocomplete
                      size="small"
                      options={products}
                      getOptionLabel={(option) => `${option.sku} - ${option.name}`}
                      value={products.find((p) => p.id === item.productId) ?? null}
                      onChange={(_, newValue) => {
                        if (!newValue) return

                        const baseProduct: ProductForSelection = {
                          id: newValue.id,
                          name: newValue.name,
                          sku: newValue.sku,
                          category: 'Lainnya',
                          unit: newValue.unit,
                          cost: newValue.cost,
                          weight: Number(newValue.weight) || 0,
                          price: Number(newValue.cost ?? '0')
                        }

                        setSelectedItemIndex(index)
                        setModalProduct(baseProduct)
                        setProductSelectModalOpen(true)
                      }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Pilih produk" size="small" />
                      )}
                      sx={{ minWidth: 250 }}
                    />
                  ) : (
                    <Box>
                      <Typography variant="body2">{item.productName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.productSku}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  {isEditing ? (
                    <TextField
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)
                      }
                      inputProps={{ min: 1 }}
                      sx={{ width: 80 }}
                    />
                  ) : (
                    (item.displayQuantity ?? item.quantity)
                  )}
                </TableCell>
                <TableCell align="center">{item.uomCode || 'PCS'}</TableCell>
                <TableCell align="right">
                  {isEditing ? (
                    <CurrencyInput
                      size="small"
                      value={Number(item.price)}
                      onChange={(val) => handleItemChange(index, 'price', val)}
                      sx={{ width: 130 }}
                    />
                  ) : (
                    formatCurrency(Number(item.price))
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={500}>
                    {formatCurrency(Number(item.price) * (item.displayQuantity ?? item.quantity))}
                  </Typography>
                </TableCell>
                {isEditing && (
                  <TableCell>
                    <Tooltip title="Hapus item">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={editItems.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(isEditing ? editItems : (transaction.items ?? [])).length === 0 && (
              <TableRow>
                <TableCell colSpan={isEditing ? 7 : 6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Tidak ada item
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {transaction && (
        <ProductSelectModal
          open={productSelectModalOpen}
          product={modalProduct}
          storeId={transaction.storeId}
          enableMultiUomPricing
          onClose={() => {
            setProductSelectModalOpen(false)
            setSelectedItemIndex(null)
            setModalProduct(null)
          }}
          onConfirm={handleProductOptionsConfirm}
        />
      )}

      

      {returns.length > 0 && (
        <Card sx={{ mt: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Riwayat Retur
            </Typography>
            {returns.map((ret) => {
              // Build a lookup from transaction items for product names and UOM info
              const txnItemMap = new Map(
                (transaction.items || []).map((ti: any) => [ti.id, ti])
              )

              const returnItems = (ret.items || []).map((ri: any) => {
                const tid = ri.transaction_item_id || ri.transactionItemId
                const txnItem: any = txnItemMap.get(tid)

                // Prioritize stored values, fallback to transaction item lookup
                let baseQty = Number(ri.quantity)
                let displayQty = Number(ri.displayQuantity || ri.display_quantity)
                let uomCode = ri.uomCode || ri.uom_code
                let productName = ri.productName || ri.product_name

                // Fallback logic if stored values are missing (backward compatibility)
                if (!uomCode || isNaN(displayQty)) {
                  displayQty = baseQty
                  uomCode = 'PCS'
                  productName = productName || 'Item'

                  if (txnItem) {
                    const txnBaseQty = Number(txnItem.quantity)
                    const txnDisplayQty = Number(txnItem.displayQuantity) || txnBaseQty

                    const conversion =
                      txnBaseQty > 0 && txnDisplayQty > 0 ? txnBaseQty / txnDisplayQty : 1
                    displayQty = conversion > 0 ? baseQty / conversion : baseQty
                    uomCode = txnItem.uomCode || 'PCS'
                    productName = txnItem.productName || txnItem.product_name || productName
                  }
                }

                return {
                  productName,
                  displayQty,
                  uomCode,
                  restock: ri.restock ?? true,
                  refundPrice: Number(ri.refund_price || ri.refundPrice || 0)
                }
              })

              

              return (
                <Paper key={ret.id} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'action.hover'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">
                        {ret.return_number || ret.returnNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ret.created_at || ret.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" color="primary">
                      Refund: {formatCurrency(Number(ret.total_refund || ret.totalRefund))}
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produk</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="center">Satuan</TableCell>
                        <TableCell align="center">Restock</TableCell>
                        <TableCell align="right">Refund</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returnItems.map((ri: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{ri.productName}</TableCell>
                          <TableCell align="right">{ri.displayQty}</TableCell>
                          <TableCell align="center">{ri.uomCode}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={ri.restock ? 'Ya' : 'Tidak'}
                              size="small"
                              color={ri.restock ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(ri.displayQty * ri.refundPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )
            })}
          </CardContent>
        </Card>
      )}

      <DeliveryOrderModal
        open={deliveryOrderModalOpen}
        transaction={
          transaction
            ? {
                id: transaction.id,
                code: transaction.code,
                createdAt: transaction.createdAt,
                storeId: transaction.storeId,
                customerId: transaction.customerId,
                customerName: transaction.customerName,
                items: transaction.items?.map((item: any) => ({
                  productName: item.productName,
                  displayQuantity: item.displayQuantity || item.quantity,
                  quantity: item.quantity,
                  uomCode: item.uomCode || 'PCS',
                  weight: item.weight || 0
                }))
              }
            : null
        }
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          address: c.address
        }))}
        onClose={() => setDeliveryOrderModalOpen(false)}
      />

      {transaction && (
        <ReturnTransactionDialog
          open={returnDialogOpen}
          transaction={transaction}
          onClose={() => setReturnDialogOpen(false)}
          onSuccess={() => {
            globalAlert.success('Retur berhasil diproses')
            loadData()
          }}
        />
      )}

      {/* Profit Detail Section (Admin Only) */}
      {canViewProfit && profitDetail.length > 0 && !isEditing && (
        <Card sx={{ mt: 3, mb: 10 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Detail Keuntungan (Admin/Owner)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produk</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="center">Satuan</TableCell>
                  <TableCell align="right">Harga Jual</TableCell>
                  <TableCell align="right">HPP (Unit)</TableCell>
                  <TableCell align="right">HPP (Total)</TableCell>
                  <TableCell align="right">Profit (Unit)</TableCell>
                  <TableCell align="right">Profit (Total)</TableCell>
                  <TableCell align="right">Margin (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {profitDetail.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="center">{item.uomCode || 'PCS'}</TableCell>
                    <TableCell align="right">{formatCurrency(item.sellPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.cogsUnit)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.cogsTotal)}</TableCell>
                    <TableCell align="right" sx={{ color: item.profitUnit >= 0 ? 'success.main' : 'error.main' }}>
                      {formatCurrency(item.profitUnit)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: item.profitTotal >= 0 ? 'success.main' : 'error.main' }}>
                      {formatCurrency(item.profitTotal)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${item.margin.toFixed(2)}%`} 
                        size="small" 
                        color={item.margin >= 0 ? 'success' : 'error'} 
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell colSpan={5} align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(profitDetail.reduce((sum, i) => sum + i.cogsTotal, 0))}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                     {formatCurrency(profitDetail.reduce((sum, i) => sum + i.profitTotal, 0))}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {(() => {
                       const totalRev = profitDetail.reduce((sum, i) => sum + i.subtotal, 0)
                       const totalProf = profitDetail.reduce((sum, i) => sum + i.profitTotal, 0)
                       return totalRev ? `${((totalProf / totalRev) * 100).toFixed(2)}%` : '0%'
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </Box>
  )
}
