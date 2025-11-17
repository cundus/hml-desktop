import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Grid, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import ProductBrowser, { type Product } from './components/ProductBrowser'
import CartPanel, { type CartItem } from './components/CartPanel'
import CustomerSelector, { type Customer } from './components/CustomerSelector'
import PaymentSection, { type PaymentMethod } from './components/PaymentSection'
import api from '../../lib/api'

const mockProducts: Product[] = [
  { id: '1', name: 'Premium Dog Food', sku: 'DOG-FOOD-001', category: 'Food', price: 120000 },
  { id: '2', name: 'Cat Kibble Salmon', sku: 'CAT-FOOD-002', category: 'Food', price: 95000 },
  { id: '3', name: 'Dog Shampoo Medicated', sku: 'DOG-CARE-003', category: 'Care', price: 68000 },
  { id: '4', name: 'Cat Litter 10kg', sku: 'CAT-LITTER-004', category: 'Care', price: 80000 },
  { id: '5', name: 'Pet Leash Nylon', sku: 'ACC-LEASH-005', category: 'Accessories', price: 45000 }
]

export default function SalesPage(): React.JSX.Element {
  const [products] = useState<Product[]>(mockProducts)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState(0)
  const [productDialogOpen, setProductDialogOpen] = useState(false)

  const customerInputRef = useRef<HTMLInputElement | null>(null)
  const discountInputRef = useRef<HTMLInputElement | null>(null)
  const paidInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadCustomers = async (): Promise<void> => {
      try {
        const res = await api.get<Customer[]>('/master/customers')
        setCustomers(res.data ?? [])
      } catch {
        // ignore for now; keep customers empty
      }
    }
    void loadCustomers()
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

  const handleCheckout = useCallback((): void => {
    alert('Sale completed (mock).')
    setCartItems([])
    setDiscount(0)
    setPaidAmount(0)
  }, [])

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
        handleCheckout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [cartItems.length, handleCheckout])

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Paper
        elevation={2}
        sx={{ p: 2, width: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight="600">
            Sales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new transaction by selecting products and completing payment.
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
              Total to Pay
            </Typography>
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Items: {cartItems.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subtotal:{' '}
              {subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discount: {discount}%
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
                  Add customer
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
                Browse products (F2)
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
          <DialogTitle>Browse products</DialogTitle>
          <DialogContent dividers sx={{ height: 420 }}>
            <ProductBrowser products={products} onAdd={handleAddToCart} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProductDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  )
}
