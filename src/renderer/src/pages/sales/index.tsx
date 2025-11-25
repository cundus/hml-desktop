import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import ProductBrowser, { type Product } from './components/ProductBrowser'
import CartPanel, { type CartItem } from './components/CartPanel'
import CustomerSelector, { type Customer } from './components/CustomerSelector'
import PaymentSection, { type PaymentMethod } from './components/PaymentSection'

export default function SalesPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setCheckoutLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  // For transaction: we need a default store. In real app, this would come from user context.
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null)

  const customerInputRef = useRef<HTMLInputElement | null>(null)
  const discountInputRef = useRef<HTMLInputElement | null>(null)
  const paidInputRef = useRef<HTMLInputElement | null>(null)

  // Load products, customers, categories, and prices from local DB
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true)

        // Load products
        const productsRes = await window.api.db.products.getAll()
        const dbProducts = productsRes.data ?? []

        // Load categories for mapping
        const categoriesRes = await window.api.db.categories.getAll()
        const categoriesMap = new Map((categoriesRes.data ?? []).map(c => [c.id, c.name]))

        // Load product prices
        const pricesRes = await window.api.db.productPrices.getAll()
        const pricesMap = new Map((pricesRes.data ?? []).map(p => [p.productId, parseFloat(p.price)]))

        // Map DB products to Product type for ProductBrowser
        const mappedProducts: Product[] = dbProducts
          .filter(p => p.isActive)
          .map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.categoryId ? (categoriesMap.get(p.categoryId) ?? 'Lainnya') : 'Lainnya',
            price: pricesMap.get(p.id) ?? parseFloat(p.cost) ?? 0
          }))

        setProducts(mappedProducts)

        // Load customers
        const customersRes = await window.api.db.customers.getAll()
        const dbCustomers = customersRes.data ?? []
        const mappedCustomers: Customer[] = dbCustomers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? undefined
        }))
        setCustomers(mappedCustomers)

        // Load stores and pick first as default
        const storesRes = await window.api.db.stores.getAll()
        const stores = storesRes.data ?? []
        if (stores.length > 0) {
          setDefaultStoreId(stores[0].id)
        }
      } catch (err) {
        console.error('Failed to load sales data:', err)
        setSnackbar({ open: true, message: 'Gagal memuat data', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )

  const total = useMemo(() => {
    const safePercent = Math.max(0, Math.min(100, discount))
    const discountAmount = (subtotal * safePercent) / 100
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discount])

  const handleAddToCart = (product: Product): void => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const handleQuantityChange = (id: string, quantity: number): void => {
    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (id: string): void => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleChangeDiscount = (value: number): void => {
    setDiscount(Math.max(0, Math.min(100, value)))
  }

  const handleCheckout = useCallback(async (): Promise<void> => {
    if (cartItems.length === 0) return
    if (!defaultStoreId) {
      setSnackbar({ open: true, message: 'Tidak ada toko default. Silakan tambahkan toko terlebih dahulu.', severity: 'error' })
      return
    }

    try {
      setCheckoutLoading(true)

      // Generate transaction code (simple timestamp-based)
      const code = `TRX-${Date.now()}`

      // Calculate values
      const subtotalValue = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discountValue = (subtotalValue * discount) / 100
      const totalValue = subtotalValue - discountValue

      // Prepare transaction items
      const items = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price.toString()
      }))

      // Create transaction in DB
      const result = await window.api.db.transactions.create({
        code,
        storeId: defaultStoreId,
        subtotal: subtotalValue.toString(),
        discount: discountValue.toString(),
        tax: '0',
        total: totalValue.toString(),
        customerId: selectedCustomerId ?? undefined,
        items
      })

      if (result.success) {
        setSnackbar({ open: true, message: `Transaksi ${code} berhasil disimpan!`, severity: 'success' })
        setCartItems([])
        setDiscount(0)
        setPaidAmount(0)
        setSelectedCustomerId(null)
      } else {
        throw new Error(result.error ?? 'Unknown error')
      }
    } catch (err) {
      console.error('Checkout failed:', err)
      setSnackbar({ open: true, message: 'Gagal menyimpan transaksi', severity: 'error' })
    } finally {
      setCheckoutLoading(false)
    }
  }, [cartItems, discount, defaultStoreId, selectedCustomerId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isInputLike =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.getAttribute('role') === 'textbox'

      // Allow Ctrl+Enter / F9 to work even when typing, but avoid intercepting other keys
      if (isInputLike && !(event.ctrlKey && event.key === 'Enter') && event.key !== 'F9') {
        return
      }

      if (event.key === 'F2' || (event.ctrlKey && event.key.toLowerCase() === 'b')) {
        event.preventDefault()
        setProductDialogOpen(true)
        return
      }

      if (event.key === 'F3' || (event.ctrlKey && event.key.toLowerCase() === 'u')) {
        event.preventDefault()
        customerInputRef.current?.focus()
        return
      }

      if (event.key === 'F4' || (event.ctrlKey && event.key.toLowerCase() === 'd')) {
        event.preventDefault()
        discountInputRef.current?.focus()
        return
      }

      if (event.key === 'F5' || (event.ctrlKey && event.key.toLowerCase() === 'p')) {
        event.preventDefault()
        paidInputRef.current?.focus()
        return
      }

      if (event.key === 'F9' || (event.ctrlKey && event.key === 'Enter')) {
        if (cartItems.length === 0) return
        event.preventDefault()
        void handleCheckout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [cartItems.length, handleCheckout])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Box sx={{ width: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight="600">
            Penjualan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Buat transaksi baru dengan memilih produk dan menyelesaikan pembayaran.
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Total Pembayaran
            </Typography>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Item: {cartItems.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subtotal: {subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diskon: {discount}%
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
              <CartPanel
                items={cartItems}
                subtotal={subtotal}
                discount={discount}
                total={total}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
                onChangeDiscount={handleChangeDiscount}
                onCheckout={handleCheckout}
                discountInputRef={discountInputRef}
              />
            </Box>
          </Grid>
          <Grid
            size={{ xs: 12, md: 5 }}
            sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <CustomerSelector
                    customers={customers}
                    selectedCustomerId={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    inputRef={customerInputRef}
                  />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.api?.openMasterCustomerWindow?.()}
                >
                  Tambah pelanggan
                </Button>
              </Box>
              <PaymentSection
                total={total}
                method={paymentMethod}
                paidAmount={paidAmount}
                onMethodChange={setPaymentMethod}
                onPaidAmountChange={setPaidAmount}
                paidInputRef={paidInputRef}
              />
              <Button
                variant="contained"
                color="secondary"
                sx={{ mt: 1 }}
                onClick={() => setProductDialogOpen(true)}
              >
                Cari produk (F2)
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Dialog
          open={productDialogOpen}
          onClose={() => setProductDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Cari produk</DialogTitle>
          <DialogContent dividers sx={{ height: 420 }}>
            <ProductBrowser products={products} onAdd={handleAddToCart} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProductDialogOpen(false)}>Tutup</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}
