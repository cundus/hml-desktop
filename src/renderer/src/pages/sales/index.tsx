import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import ProductBrowser, { type Product } from './components/ProductBrowser'
import ProductSelectModal, { type ProductSelectResult, type ProductForSelection } from './components/ProductSelectModal'
import CartPanel, { type CartItem } from './components/CartPanel'
import CustomerSelector, { type Customer } from './components/CustomerSelector'
import PaymentMethodDialog from './components/PaymentMethodDialog'
import {
  OpenShiftDialog,
  CloseShiftDialog,
  PinVerifyDialog,
  ShiftSettlementDialog
} from '../../components/shift'
import { useShift } from '@renderer/hooks/useShift'
import useAuth from '../../hooks/useAuth'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'
import useBranchConfig from '../../hooks/useBranchConfig'
import { formatCurrency } from '@renderer/utils/currency'
import Kbd from '../../components/Kbd'

export default function SalesPage(): React.JSX.Element {
  const { token, userName } = useAuth()
  const { flags: featureFlags } = useFeatureFlags()
  const { storeId: branchStoreId } = useBranchConfig()
  const { currentShift, hasOpenShift, isLoading: shiftLoading, openShift, closeShift } = useShift()
  const [openShiftDialogOpen, setOpenShiftDialogOpen] = useState(false)
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false)
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSelectModalOpen, setProductSelectModalOpen] = useState(false)
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setCheckoutLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // For transaction: we need a default store. In real app, this would come from user context.
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null)

  const customerInputRef = useRef<HTMLInputElement | null>(null)
  const discountInputRef = useRef<import('@renderer/components/CurrencyInput').CurrencyInputRef | null>(null)

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
        const categoriesMap = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]))

        // Load product prices
        const pricesRes = await window.api.db.productPrices.getAll()
        const pricesMap = new Map(
          (pricesRes.data ?? []).map((p) => [p.productId, parseFloat(p.price)])
        )

        // Map DB products to Product type for ProductBrowser
        const mappedProducts: Product[] = dbProducts
          .filter((p) => p.isActive)
          .map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.categoryId ? (categoriesMap.get(p.categoryId) ?? 'Lainnya') : 'Lainnya',
            unit: p.unit ?? 'PCS',
            cost: p.cost ?? '0',
            weight: p.weight ?? '0',
            price: pricesMap.get(p.id) ?? parseFloat(p.cost) ?? 0
          }))

        setProducts(mappedProducts)

        // Load customers
        const customersRes = await window.api.db.customers.getAll()
        const dbCustomers = customersRes.data ?? []
        const mappedCustomers: Customer[] = dbCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? undefined
        }))
        setCustomers(mappedCustomers)

        // Use branch store ID if available, otherwise pick first store (HQ mode)
        if (branchStoreId) {
          setDefaultStoreId(branchStoreId)
        } else {
          // HQ mode - pick first store as default
          const storesRes = await window.api.db.stores.getAll()
          const stores = storesRes.data ?? []
          if (stores.length > 0) {
            setDefaultStoreId(stores[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load sales data:', err)
        setSnackbar({ open: true, message: 'Gagal memuat data', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [branchStoreId])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )

  // Discount is now a nominal value (Rupiah), not percentage
  const total = useMemo(() => {
    return Math.max(0, subtotal - discount)
  }, [subtotal, discount])

  // Open product selection modal when clicking a product
  const handleProductClick = (product: Product): void => {
    setSelectedProduct(product)
    setProductSelectModalOpen(true)
  }

  // Handle confirmed selection from modal
  const handleProductSelectConfirm = (result: ProductSelectResult): void => {
    const { product, selectedUom, selectedPrice, quantity, unitPrice } = result

    // Create a unique cart line ID based on product + UOM + price category
    const cartItemId = `${product.id}-${selectedUom.code}-${selectedPrice.id}`
    const conversionFactor = selectedUom.conversionFactor || 1
    const baseQuantity = quantity * conversionFactor

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === cartItemId)
      if (existing) {
        const newQuantity = existing.quantity + quantity
        const conv = existing.conversionFactor ?? conversionFactor
        const newBaseQuantity = newQuantity * conv
        const price = existing.price
        return prev.map((item) =>
          item.id === cartItemId
            ? {
                ...item,
                quantity: newQuantity,
                baseQuantity: newBaseQuantity,
                total: newQuantity * price
              }
            : item
        )
      } else {
        return [
          ...prev,
          {
            ...product,
            id: cartItemId,
            productId: product.id,
            uomId: selectedUom.uomId ?? null,
            uomCode: selectedUom.code,
            priceCategoryId: selectedPrice.id,
            priceCategoryName: selectedPrice.name,
            conversionFactor,
            quantity,
            baseQuantity,
            price: unitPrice,
            total: unitPrice * quantity
          } as CartItem
        ]
      }
    })

    setProductSelectModalOpen(false)
    setSelectedProduct(null)
  }

  // Legacy direct add (for quick add without modal if needed)
  const handleAddToCart = (product: Product): void => {
    // Open modal instead of direct add
    handleProductClick(product)
  }

  const handleQuantityChange = (id: string, quantity: number): void => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const conv = item.conversionFactor ?? 1
        const baseQuantity = quantity * conv
        return {
          ...item,
          quantity,
          baseQuantity,
          total: item.price * quantity
        }
      })
    )
  }

  const handleRemoveItem = (id: string): void => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleChangeDiscount = (value: number): void => {
    // Discount cannot exceed subtotal
    setDiscount(Math.max(0, Math.min(subtotal, value)))
  }

  const handleCheckout = useCallback((): void => {
    if (cartItems.length === 0) return
    if (!defaultStoreId) {
      setSnackbar({
        open: true,
        message: 'Tidak ada toko default. Silakan tambahkan toko terlebih dahulu.',
        severity: 'error'
      })
      return
    }

    // Show payment method dialog instead of creating transaction directly
    setPaymentMethodDialogOpen(true)
  }, [cartItems.length, defaultStoreId])

  const handleConfirmPayment = useCallback(
    async (
      paymentMethod: string,
      paymentDeadline?: Date,
      cashDetails?: { paidAmount: string; change: string },
      _downPayment?: number
    ): Promise<void> => {
      if (cartItems.length === 0) return
      if (!defaultStoreId) {
        setSnackbar({
          open: true,
          message: 'Tidak ada toko default. Silakan tambahkan toko terlebih dahulu.',
          severity: 'error'
        })
        return
      }

      try {
        setCheckoutLoading(true)

        // Generate transaction code (simple timestamp-based)
        const code = `TRX-${Date.now()}`

        // Prepare transaction items (quantity in base units for inventory)
        // Also calculate total weight based on product weights and quantities
        let totalWeight = 0
        const transactionItems = cartItems.map((item) => {
          const conv = item.conversionFactor ?? 1
          const baseQuantity = item.baseQuantity ?? item.quantity * conv
          // Weight calculation: base weight * base quantity (weight is per base unit)
          const itemWeight = (parseFloat(item.weight || '0') || 0) * baseQuantity
          totalWeight += itemWeight
          return {
            productId: item.productId ?? item.id,
            quantity: baseQuantity,
            displayQuantity: item.quantity,  // Original quantity user selected
            uomCode: item.uomCode ?? item.unit,  // UOM user selected
            productName: item.name,
            productSku: item.sku,
            price: item.price.toString()
          }
        })

        // Create transaction via IPC with payment method
        const result = await window.api.db.transactions.create({
          code,
          storeId: defaultStoreId,
          subtotal: subtotal.toString(),
          discount: discount.toString(),
          tax: '0',
          total: total.toString(),
          totalWeight: totalWeight.toString(),
          paymentMethod,
          paymentDeadline,
          receiptPrinted: false,
          customerId: selectedCustomerId ?? undefined,
          userId: userName ?? undefined,
          items: transactionItems
        })

        if (result.success) {
          // Print receipt after successful transaction
          try {
            // Get customer name if selected
            const customerName = selectedCustomerId
              ? customers.find((c) => c.id === selectedCustomerId)?.name
              : undefined

            const printResult = await window.api.db.receipt.printReceipt(result.data, {
              customerName,
              paidAmount: cashDetails?.paidAmount,
              change: cashDetails?.change
            })

            if (printResult.success) {
              // Update receipt printed status
              await window.api.db.receipt.updateReceiptPrinted(result.data.id, true)

              setSnackbar({
                open: true,
                message: 'Transaksi berhasil disimpan dan struk dicetak',
                severity: 'success'
              })
            } else {
              // Receipt printing failed but transaction succeeded
              setSnackbar({
                open: true,
                message: `Transaksi berhasil disimpan, cetak struk gagal: ${printResult.error || 'Printer error'}`,
                severity: 'error'
              })
            }
          } catch (printError) {
            console.error('Receipt printing error:', printError)
            setSnackbar({
              open: true,
              message: 'Transaksi berhasil disimpan, cetak struk gagal',
              severity: 'error'
            })
          }

          // Clear cart and reset form (after printing attempt)
          setCartItems([])
          setDiscount(0)
          setSelectedCustomerId(null)
          setPaymentMethodDialogOpen(false)
        } else {
          setSnackbar({
            open: true,
            message: result.error || 'Gagal menyimpan transaksi',
            severity: 'error'
          })
        }
      } catch (err) {
        console.error('Checkout failed:', err)
        setSnackbar({ open: true, message: 'Gagal menyimpan transaksi', severity: 'error' })
      } finally {
        setCheckoutLoading(false)
      }
    },
    [cartItems, discount, subtotal, total, defaultStoreId, selectedCustomerId, userName]
  )

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

      if (
        (event.ctrlKey && event.key.toLowerCase() === 'p') ||
        (event.ctrlKey && event.key.toLowerCase() === 'b')
      ) {
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

  if (loading || shiftLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Show open shift prompt if no active shift
  if (!hasOpenShift) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: 3
        }}
      >
        <Typography variant="h5" color="text.secondary">
          Belum ada shift aktif
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Anda harus membuka shift terlebih dahulu sebelum dapat melakukan transaksi.
        </Typography>
        <Button variant="contained" size="large" onClick={() => setOpenShiftDialogOpen(true)}>
          Buka Shift
        </Button>
        <OpenShiftDialog
          open={openShiftDialogOpen}
          onClose={() => setOpenShiftDialogOpen(false)}
          onSubmit={openShift}
        />
      </Box>
    )
  }

  // Show PIN verification if shift is open but PIN not verified
  if (!pinVerified) {
    const handleVerifyPin = async (pin: string): Promise<boolean> => {
      if (!token) return false
      const response = await window.api.db.auth.verifyPin(token, pin)
      if (response.success && response.data) {
        setPinVerified(true)
        return true
      }
      return false
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: 3
        }}
      >
        <Typography variant="h5" color="text.secondary">
          Verifikasi PIN
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Masukkan PIN untuk melanjutkan ke halaman kasir.
        </Typography>
        <Button variant="contained" size="large" onClick={() => setShowPinDialog(true)}>
          Masukkan PIN
        </Button>
        <PinVerifyDialog
          open={showPinDialog}
          userName={userName ?? undefined}
          onVerify={handleVerifyPin}
          onClose={() => setShowPinDialog(false)}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
      <Box sx={{ width: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <Box>
            <Typography variant="h5" fontWeight="600">
              Penjualan
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Buat transaksi baru dengan memilih produk dan menyelesaikan pembayaran.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Shift: ${currentShift?.userName ?? 'Kasir'}`}
              color="success"
              size="small"
              variant="outlined"
            />
            <Button variant="outlined" size="small" onClick={() => setSettlementDialogOpen(true)}>
              Ringkasan
            </Button>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={() => setCloseShiftDialogOpen(true)}
            >
              Tutup Shift
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Customer selector at top */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              Pelanggan <Kbd keys={['F3']} size="small" />
            </Typography>
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

        {/* Summary */}
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
              {formatCurrency(total)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Item: {cartItems.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subtotal: {formatCurrency(subtotal)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diskon: {formatCurrency(discount)}
            </Typography>
          </Box>
        </Box>

        {/* Product search above full-width cart */}
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="subtitle2">Daftar Produk</Typography>
          <Button variant="contained" color="secondary" onClick={() => setProductDialogOpen(true)}>
            Cari produk <Kbd keys={['Ctrl', 'P']} size="small" />
          </Button>
        </Box>

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

        <ProductSelectModal
          open={productSelectModalOpen}
          product={selectedProduct as ProductForSelection | null}
          storeId={defaultStoreId}
          enableMultiUomPricing={featureFlags.enableMultiUomPricing}
          onClose={() => {
            setProductSelectModalOpen(false)
            setSelectedProduct(null)
          }}
          onConfirm={handleProductSelectConfirm}
        />

        <PaymentMethodDialog
          open={paymentMethodDialogOpen}
          total={cartItems.reduce((sum, item) => sum + item.total, 0) - discount}
          onClose={() => setPaymentMethodDialogOpen(false)}
          onConfirm={handleConfirmPayment}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <CloseShiftDialog
          open={closeShiftDialogOpen}
          onClose={() => setCloseShiftDialogOpen(false)}
          onConfirm={closeShift}
          initialCash={currentShift?.initialCash ?? '0'}
        />

        <ShiftSettlementDialog
          open={settlementDialogOpen}
          shiftId={currentShift?.id ?? null}
          onClose={() => setSettlementDialogOpen(false)}
          onProceedToClose={() => {
            setSettlementDialogOpen(false)
            setCloseShiftDialogOpen(true)
          }}
        />
      </Box>
    </Box>
  )
}
