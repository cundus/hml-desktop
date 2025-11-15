import { useEffect, useMemo, useState } from 'react'
import { Box, Grid } from '@mui/material'
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

  const total = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])

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
    setDiscount(Math.max(0, value))
  }

  const handleCheckout = (): void => {
    // Placeholder for actual checkout logic / dialog
    alert('Sale completed (mock).')
    setCartItems([])
    setDiscount(0)
    setPaidAmount(0)
  }

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

        <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <ProductBrowser products={products} onAdd={handleAddToCart} />
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
              />
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
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
