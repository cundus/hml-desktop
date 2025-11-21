import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Autocomplete from '@mui/material/Autocomplete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteIcon from '@mui/icons-material/Delete'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import PaymentIcon from '@mui/icons-material/Payment'

interface Product {
  id: string
  name: string
  sku: string
  cost: string
}

interface Store {
  id: string
  name: string
  code: string
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

interface CartItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  price: number
  subtotal: number
}

export default function POSPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState<number>(0)
  const [tax, setTax] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      const [productsRes, storesRes, customersRes] = await Promise.all([
        window.api.db.products.getAll(),
        window.api.db.stores.getAll(),
        window.api.db.customers.getAll()
      ])

      if (productsRes.success && storesRes.success && customersRes.success) {
        setProducts(productsRes.data ?? [])
        setStores(storesRes.data ?? [])
        setCustomers(customersRes.data ?? [])
        
        // Auto-select first store if available
        if (storesRes.data && storesRes.data.length > 0) {
          setSelectedStore(storesRes.data[0].id)
        }
      }
    } catch (err) {
      console.error('Gagal memuat data', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (): Promise<void> => {
    if (!selectedProduct || !selectedStore) {
      alert('Silakan pilih produk dan toko')
      return
    }

    // Get price for this product at selected store
    const priceRes = await window.api.db.productPrices.getByProductAndStore(
      selectedProduct.id,
      selectedStore
    )

    const price = priceRes.success && priceRes.data ? parseFloat(priceRes.data.price) : parseFloat(selectedProduct.cost)

    // Check if product already in cart
    const existingIndex = cart.findIndex((item) => item.productId === selectedProduct.id)

    if (existingIndex >= 0) {
      // Update quantity
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * newCart[existingIndex].price
      setCart(newCart)
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        quantity: 1,
        price,
        subtotal: price
      }
      setCart([...cart, newItem])
    }

    setSelectedProduct(null)
  }

  const updateQuantity = (index: number, delta: number): void => {
    const newCart = [...cart]
    newCart[index].quantity += delta
    
    if (newCart[index].quantity <= 0) {
      removeFromCart(index)
      return
    }
    
    newCart[index].subtotal = newCart[index].quantity * newCart[index].price
    setCart(newCart)
  }

  const removeFromCart = (index: number): void => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const clearCart = (): void => {
    setCart([])
    setDiscount(0)
    setTax(0)
    setSelectedCustomer('')
  }

  const calculateSubtotal = (): number => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal()
    return subtotal - discount + tax
  }

  const handleCheckout = (): void => {
    if (cart.length === 0) {
      alert('Keranjang kosong')
      return
    }
    if (!selectedStore) {
      alert('Silakan pilih toko')
      return
    }
    setPaymentDialogOpen(true)
  }

  const processPayment = async (): Promise<void> => {
    try {
      setProcessing(true)

      const subtotal = calculateSubtotal()
      const total = calculateTotal()

      // Generate transaction code
      const code = `TRX-${Date.now()}`

      // Create transaction
      const transactionData = {
        code,
        storeId: selectedStore,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        customerId: selectedCustomer || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toFixed(2)
        }))
      }

      const response = await window.api.db.transactions.create(transactionData)

      if (response.success) {
        // Create stock transactions for each item
        for (const item of cart) {
          await window.api.db.stockTransactions.create({
            productId: item.productId,
            storeId: selectedStore,
            type: 'SALE',
            quantity: item.quantity,
            reference: code
          })

          // Update product location (reduce quantity)
          await window.api.db.productLocations.adjustQuantity(
            item.productId,
            selectedStore,
            -item.quantity
          )
        }

        alert(`Transaksi ${code} berhasil!`)
        clearCart()
        setPaymentDialogOpen(false)
      } else {
        alert(response.error || 'Transaksi gagal')
      }
    } catch (err) {
      alert('Transaksi gagal')
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Kasir
      </Typography>

      <Stack direction="row" spacing={3}>
        {/* Left Side - Product Selection */}
        <Box flex={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tambah Produk
              </Typography>

              <Stack spacing={2}>
                <TextField
                  select
                  label="Toko"
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  fullWidth
                  required
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Pelanggan (Opsional)"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="">Pelanggan Umum</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => `${option.name} (${option.sku})`}
                  value={selectedProduct}
                  onChange={(_, newValue) => setSelectedProduct(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Cari Produk..." placeholder="Ketik untuk mencari..." />
                  )}
                />

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addToCart}
                  disabled={!selectedProduct || !selectedStore}
                  fullWidth
                >
                  Tambah ke Keranjang
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right Side - Cart */}
        <Box flex={1.5}>
          <Paper>
            <Box p={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  <ShoppingCartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Keranjang Belanja ({cart.length} item)
                </Typography>
                <Button variant="outlined" size="small" onClick={clearCart} disabled={cart.length === 0}>
                  Kosongkan Keranjang
                </Button>
              </Stack>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produk</TableCell>
                    <TableCell align="center">Jumlah</TableCell>
                    <TableCell align="right">Harga</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Aksi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">{item.productName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.sku}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                          <IconButton size="small" onClick={() => updateQuantity(index, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => updateQuantity(index, 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">${item.price.toFixed(2)}</TableCell>
                      <TableCell align="right">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => removeFromCart(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cart.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">Keranjang kosong</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              {/* Totals */}
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal:</Typography>
                  <Typography>${calculateSubtotal().toFixed(2)}</Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>Diskon:</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: 120 }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>Pajak:</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: 120 }}
                  />
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PaymentIcon />}
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Bayar
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Stack>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Selesaikan Pembayaran</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Subtotal:</Typography>
              <Typography>${calculateSubtotal().toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Diskon:</Typography>
              <Typography>-${discount.toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography>Pajak:</Typography>
              <Typography>+${tax.toFixed(2)}</Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Total Pembayaran:</Typography>
              <Typography variant="h6" color="primary">
                ${calculateTotal().toFixed(2)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {cart.length} item(s) in cart
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Batal</Button>
          <Button
            onClick={processPayment}
            variant="contained"
            disabled={processing}
            startIcon={<PaymentIcon />}
          >
            {processing ? 'Memproses...' : 'Selesaikan Pembayaran'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
