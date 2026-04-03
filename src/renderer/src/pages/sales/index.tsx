import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import ProductBrowser, { type Product } from './components/ProductBrowser'
import ProductSelectModal, {
  type ProductSelectResult,
  type ProductForSelection
} from './components/ProductSelectModal'
import { ExpenseForm, type ExpenseFormData } from './components/ExpenseForm'
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
import OpenBillDialog, { type OpenBillSummary } from './components/OpenBillDialog'

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
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
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
  const [defaultSalesId, setDefaultSalesId] = useState<string | undefined>(undefined)
  const [selectedSalesId, setSelectedSalesId] = useState<string>('')
  const [salesPersons, setSalesPersons] = useState<
    { id: string; name: string; isActive: boolean }[]
  >([])

  // Point redemption state
  const [customerPoints, setCustomerPoints] = useState(0)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [pointSettings, setPointSettings] = useState<{
    redemptionValue: number
    minRedemption: number
    isActive: boolean
  } | null>(null)

  const customerInputRef = useRef<HTMLInputElement | null>(null)
  const discountInputRef = useRef<
    import('@renderer/components/CurrencyInput').CurrencyInputRef | null
  >(null)

  // Load products, customers, categories, and prices from local DB
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true)

        // define store promise based on mode
        const storePromise = branchStoreId
          ? window.api.db.stores.getById(branchStoreId)
          : window.api.db.stores.getAll()

        // Fetch all data in parallel
        const [
          productsRes,
          categoriesRes,
          retailPricesRes,
          customersRes,
          storeRes,
          salesRes
        ] = await Promise.all([
          window.api.db.products.getAll(),
          window.api.db.categories.getAll(),
          window.api.db.pricing.getAllBaseRetailPrices(),
          window.api.db.customers.getAll(),
          storePromise,
          window.api.db.salesPersons.getActive().catch(() => ({ success: false, data: [] }))
        ])

        const dbProducts = productsRes.data ?? []
        const categoriesMap = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]))
        const retailPricesMap = new Map(
          (retailPricesRes.data ?? []).map((p) => [p.productId, parseFloat(p.price)])
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
            // Use RETAIL price from new pricing system, fallback to 0 if not set
            price: retailPricesMap.get(p.id) ?? 0
          }))

        setProducts(mappedProducts)

        // Load customers
        const dbCustomers = customersRes.data ?? []
        const mappedCustomers: Customer[] = dbCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? undefined
        }))
        setCustomers(mappedCustomers)

        // Handle Store & Sales ID
        if (branchStoreId) {
          setDefaultStoreId(branchStoreId)
          // Branch mode - get store info to get default sales
          // storeRes is getById result
          if (storeRes.success && !Array.isArray(storeRes.data) && storeRes.data?.defaultSalesId) {
            setDefaultSalesId(storeRes.data.defaultSalesId)
          }
        } else {
          // HQ mode
          // storeRes is getAll result
          const stores = Array.isArray(storeRes.data) ? storeRes.data : []
          if (stores.length > 0) {
            setDefaultStoreId(stores[0].id)
            if (stores[0].defaultSalesId) {
              setDefaultSalesId(stores[0].defaultSalesId)
            }
          }
        }

        // Load sales persons
        if (salesRes.success) {
          setSalesPersons(salesRes.data ?? [])
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

  // Set selectedSalesId when defaultSalesId changes
  useEffect(() => {
    if (defaultSalesId && !selectedSalesId) {
      setSelectedSalesId(defaultSalesId)
    }
  }, [defaultSalesId, selectedSalesId])

  // Load point settings on mount
  useEffect(() => {
    const loadPointSettings = async (): Promise<void> => {
      try {
        const res = await window.api.db.points.getSettings()
        if (res.success && res.data) {
          setPointSettings({
            redemptionValue: Number(res.data.redemptionValue),
            minRedemption: res.data.minRedemption,
            isActive: res.data.isActive
          })
        }
      } catch (err) {
        console.error('Failed to load point settings:', err)
      }
    }
    void loadPointSettings()
  }, [])

  // Fetch customer points when customer changes
  useEffect(() => {
    const fetchCustomerPoints = async (): Promise<void> => {
      if (!selectedCustomerId) {
        setCustomerPoints(0)
        setPointsToRedeem(0)
        return
      }
      try {
        const res = await window.api.db.points.getCustomerPoints(selectedCustomerId)
        if (res.success) {
          setCustomerPoints(res.data ?? 0)
          setPointsToRedeem(0) // Reset redemption on customer change
        }
      } catch (err) {
        console.error('Failed to fetch customer points:', err)
        setCustomerPoints(0)
      }
    }
    void fetchCustomerPoints()
  }, [selectedCustomerId])

  // Fetch store name for current shift
  const [currentStoreName, setCurrentStoreName] = useState<string>('')
  useEffect(() => {
    const fetchStoreName = async (): Promise<void> => {
      if (currentShift?.storeId) {
        try {
          // If interface says storeName exists but runtime doesn't, we fetch it
          if (currentShift.storeName) {
            setCurrentStoreName(currentShift.storeName)
            return
          }
          
          const res = await window.api.db.stores.getById(currentShift.storeId)
          if (res.success && res.data) {
            setCurrentStoreName(res.data.name)
          }
        } catch (err) {
          console.error('Failed to fetch store name:', err)
        }
      } else {
        setCurrentStoreName('')
      }
    }
    void fetchStoreName()
  }, [currentShift?.storeId, currentShift?.storeName])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )

  // Discount is now a nominal value (Rupiah), not percentage
  // Point discount = pointsToRedeem * redemptionValue
  const pointDiscount = useMemo(
    () => pointsToRedeem * (pointSettings?.redemptionValue ?? 10),
    [pointsToRedeem, pointSettings?.redemptionValue]
  )

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount - pointDiscount)
  }, [subtotal, discount, pointDiscount])

  // Open product selection modal when clicking a product
  const handleProductClick = (product: Product): void => {
    setSelectedProduct(product)
    setProductSelectModalOpen(true)
  }

  // Handle confirmed selection from modal (add or edit)
  const handleProductSelectConfirm = async (result: ProductSelectResult): Promise<void> => {
    const { product, selectedUom, selectedPrice, quantity, unitPrice } = result

    // Create a unique cart line ID based on product + UOM + price category
    const newCartItemId = `${product.id}-${selectedUom.code}-${selectedPrice.id}`
    const conversionFactor = selectedUom.conversionFactor || 1
    const baseQuantity = quantity * conversionFactor
    const storeId = currentShift?.storeId ?? defaultStoreId

    if (editingCartItem) {
      // ── EDIT MODE ──
      const oldBaseQuantity = editingCartItem.baseQuantity ?? 0
      const oldCartItemId = editingCartItem.id

      // Adjust stock reservation based on quantity difference
      if (storeId && editingCartItem.productId) {
        const diff = baseQuantity - oldBaseQuantity
        try {
          if (diff > 0) {
            await window.api.db.inventory.reserveStock(editingCartItem.productId, storeId, diff)
          } else if (diff < 0) {
            await window.api.db.inventory.releaseStock(editingCartItem.productId, storeId, Math.abs(diff))
          }
        } catch (error) {
          console.error('Failed to adjust stock reservation:', error)
        }
      }

      setCartItems((prev) => {
        // Check if the new cart ID already exists (different item with same product+uom+price)
        const duplicateItem = prev.find((item) => item.id === newCartItemId && item.id !== oldCartItemId)

        if (duplicateItem) {
          // Merge: combine quantity into the existing item, remove the edited item
          const mergedQuantity = duplicateItem.quantity + quantity
          const conv = duplicateItem.conversionFactor ?? conversionFactor
          const mergedBaseQuantity = mergedQuantity * conv
          return prev
            .filter((item) => item.id !== oldCartItemId)
            .map((item) =>
              item.id === newCartItemId
                ? {
                    ...item,
                    quantity: mergedQuantity,
                    baseQuantity: mergedBaseQuantity,
                    total: mergedQuantity * item.price
                  }
                : item
            )
        } else {
          // Update the edited item in place
          return prev.map((item) =>
            item.id === oldCartItemId
              ? {
                  ...item,
                  id: newCartItemId,
                  uomId: selectedUom.uomId ?? null,
                  uomCode: selectedUom.code,
                  priceCategoryId: selectedPrice.id,
                  priceCategoryName: selectedPrice.name,
                  conversionFactor,
                  quantity,
                  baseQuantity,
                  price: unitPrice,
                  total: unitPrice * quantity
                }
              : item
          )
        }
      })

      setEditingCartItem(null)
    } else {
      // ── ADD MODE ──
      // Reserve stock for this quantity
      if (storeId) {
        try {
          await window.api.db.inventory.reserveStock(product.id, storeId, baseQuantity)
        } catch (error) {
          console.error('Failed to reserve stock:', error)
        }
      }

      setCartItems((prev) => {
        const existing = prev.find((item) => item.id === newCartItemId)
        if (existing) {
          const newQuantity = existing.quantity + quantity
          const conv = existing.conversionFactor ?? conversionFactor
          const newBaseQuantity = newQuantity * conv
          const price = existing.price
          return prev.map((item) =>
            item.id === newCartItemId
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
              id: newCartItemId,
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
    }

    setProductSelectModalOpen(false)
    setSelectedProduct(null)
  }

  // Legacy direct add (for quick add without modal if needed)
  const handleAddToCart = (product: Product): void => {
    // Open modal instead of direct add
    handleProductClick(product)
  }

  // Edit an existing cart item — opens ProductSelectModal in edit mode
  const handleEditCartItem = (item: CartItem): void => {
    const product = products.find((p) => p.id === (item.productId ?? item.id))
    if (!product) return
    setEditingCartItem(item)
    setSelectedProduct(product)
    setProductSelectModalOpen(true)
  }


  const handleRemoveItem = async (id: string): Promise<void> => {
    const item = cartItems.find((i) => i.id === id)
    if (!item) return

    // Release reserved stock for this item
    const storeId = currentShift?.storeId ?? defaultStoreId
    if (storeId && item.productId && item.baseQuantity) {
      try {
        await window.api.db.inventory.releaseStock(item.productId, storeId, item.baseQuantity)
      } catch (error) {
        console.error('Failed to release stock:', error)
      }
    }

    setCartItems((prev) => prev.filter((cartItem) => cartItem.id !== id))
  }

  const handleChangeDiscount = (value: number): void => {
    // Discount cannot exceed subtotal
    setDiscount(Math.max(0, Math.min(subtotal, value)))
  }

  const releaseAllReservedItems = async (): Promise<void> => {
    const storeId = currentShift?.storeId ?? defaultStoreId
    if (!storeId) return

    // Release all items in cart
    await Promise.all(
      cartItems.map(async (item) => {
        if (item.productId && item.baseQuantity) {
          try {
            await window.api.db.inventory.releaseStock(item.productId, storeId, item.baseQuantity)
          } catch (error) {
            console.error('Failed to release stock for item:', item.productId, error)
          }
        }
      })
    )
  }

  const handleCheckout = useCallback(async (): Promise<void> => {
    if (cartItems.length === 0) return
    const targetStoreId = currentShift?.storeId ?? defaultStoreId
    if (!targetStoreId) {
      setSnackbar({
        open: true,
        message: 'Tidak ada toko aktif. Silakan buka shift atau atur toko default.',
        severity: 'error'
      })
      return
    }
    if (!selectedSalesId) {
      setSnackbar({
        open: true,
        message: 'Silakan pilih sales person terlebih dahulu.',
        severity: 'error'
      })
      return
    }

    // Show payment method dialog instead of creating transaction directly
    setPaymentMethodDialogOpen(true)
  }, [cartItems.length, defaultStoreId, selectedSalesId])

  const handleConfirmPayment = useCallback(
    async (
      paymentMethod: string,
      paymentDeadline?: Date,
      cashDetails?: { paidAmount: string; change: string },
      _downPayment?: number
    ): Promise<void> => {
      if (cartItems.length === 0) return
      const targetStoreId = currentShift?.storeId ?? defaultStoreId
      if (!targetStoreId) {
        setSnackbar({
          open: true,
          message: 'Tidak ada toko aktif. Silakan buka shift atau atur toko default.',
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
            displayQuantity: item.quantity, // Original quantity user selected
            uomCode: item.uomCode ?? item.unit, // UOM user selected
            productName: item.name,
            productSku: item.sku,
            price: item.price.toString()
          }
        })

        // Create transaction via IPC with payment method and sales
        // Total discount = manual discount + point discount
        const totalDiscountAmount = discount + pointDiscount
        const result = await window.api.db.transactions.create({
          code,
          storeId: currentShift?.storeId ?? defaultStoreId,
          subtotal: subtotal.toString(),
          discount: totalDiscountAmount.toString(),
          tax: '0',
          total: total.toString(),
          totalWeight: totalWeight.toString(),
          paymentMethod,
          paymentDeadline,
          receiptPrinted: false,
          customerId: selectedCustomerId ?? undefined,
          userId: userName ?? undefined,
          salesId: selectedSalesId || undefined,
          salesName: selectedSalesId
            ? salesPersons.find((sp) => sp.id === selectedSalesId)?.name
            : undefined,
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

          // Handle point redemption if customer is earning/redeeming points
          if (selectedCustomerId && pointsToRedeem > 0) {
            try {
              await window.api.db.points.redeemPoints({
                customerId: selectedCustomerId,
                transactionId: result.data.id,
                points: pointsToRedeem
              })
              console.log(
                `[Checkout] Redeemed ${pointsToRedeem} points for customer ${selectedCustomerId}`
              )
            } catch (pointErr) {
              console.error('Point redemption failed:', pointErr)
              // Don't fail the transaction if point redemption fails
            }
          }

          // Clear cart and reset form (after printing attempt)
          // Clear cart and reset form (after printing attempt)
          // Note: Reservations are automatically cleared when stock is deducted during transaction creation
          // But if we want to be extra safe or if deduction doesn't auto-clear reservation (depending on backend logic),
          // we might want to release here.
          // However, standard flow: Reservation -> Sale (deduct total) -> Result: Available = Qty - Sold.
          // If we allow reservation to persist, it leads to double counting.
          // Current backend logic: Sales deduct quantity. Reservation logic is separate.
          // To calculate available correctly: Available = Qty - Reserved.
          // Upon sale, Qty decreases. We MUST release reservation for sold items.
          await releaseAllReservedItems()

          setCartItems([])
          setDiscount(0)
          setPointsToRedeem(0)
          setCustomerPoints(0)
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
    [
      cartItems,
      discount,
      subtotal,
      total,
      defaultStoreId,
      selectedCustomerId,
      userName,
      selectedSalesId,
      salesPersons
    ]
  )

  // ── Open Bill handling ────────────────────────────────────────
  const [openBillDialogOpen, setOpenBillDialogOpen] = useState(false)
  const [openBillDialogMode, setOpenBillDialogMode] = useState<'save' | 'list'>('save')
  const [openBills, setOpenBills] = useState<OpenBillSummary[]>([])
  const [openBillCount, setOpenBillCount] = useState(0)
  const [openBillLoading, setOpenBillLoading] = useState(false)

  // Load open bill count when shift changes
  useEffect(() => {
    const loadOpenBillCount = async (): Promise<void> => {
      if (!currentShift?.id) {
        setOpenBillCount(0)
        return
      }
      try {
        const res = await window.api.db.openBills.countByShiftId(currentShift.id)
        if (res.success) {
          setOpenBillCount(res.data ?? 0)
        }
      } catch {
        // ignore
      }
    }
    void loadOpenBillCount()
  }, [currentShift?.id])

  const loadOpenBills = async (): Promise<void> => {
    if (!currentShift?.id) return
    setOpenBillLoading(true)
    try {
      const res = await window.api.db.openBills.getByShiftId(currentShift.id)
      if (res.success && res.data) {
        const summaries: OpenBillSummary[] = await Promise.all(
          res.data.map(async (bill) => {
            // Fetch items to get count
            const detail = await window.api.db.openBills.getById(bill.id)
            return {
              id: bill.id,
              label: bill.label,
              subtotal: bill.subtotal,
              discount: bill.discount,
              total: bill.total,
              customerId: bill.customerId,
              salesName: bill.salesName,
              createdBy: bill.createdBy,
              createdAt: bill.createdAt,
              itemCount: detail.data?.items?.length ?? 0
            }
          })
        )
        setOpenBills(summaries)
        setOpenBillCount(summaries.length)
      }
    } catch (err) {
      console.error('Failed to load open bills:', err)
    } finally {
      setOpenBillLoading(false)
    }
  }

  const handleSaveOpenBill = async (label: string, notes?: string): Promise<void> => {
    if (cartItems.length === 0 || !currentShift?.id) return
    const targetStoreId = currentShift?.storeId ?? defaultStoreId
    if (!targetStoreId) return

    const items = cartItems.map((item) => ({
      productId: item.productId ?? item.id,
      cartItemId: item.id,
      quantity: item.quantity,
      displayQuantity: item.quantity,
      uomCode: item.uomCode ?? item.unit,
      uomId: item.uomId ?? undefined,
      priceCategoryId: item.priceCategoryId ?? undefined,
      priceCategoryName: item.priceCategoryName ?? undefined,
      conversionFactor: item.conversionFactor ?? 1,
      baseQuantity: item.baseQuantity ?? item.quantity,
      productName: item.name,
      productSku: item.sku,
      unitPrice: item.price.toString(),
      weight: item.weight ?? '0'
    }))

    const res = await window.api.db.openBills.create({
      label: label || undefined,
      storeId: targetStoreId,
      shiftId: currentShift.id,
      customerId: selectedCustomerId ?? undefined,
      salesId: selectedSalesId || undefined,
      salesName: selectedSalesId
        ? salesPersons.find((sp) => sp.id === selectedSalesId)?.name
        : undefined,
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      total: total.toString(),
      notes,
      createdBy: userName ?? undefined,
      items
    })

    if (res.success) {
      // Clear cart but keep reservations (they'll persist until shift close or recall+checkout)
      setCartItems([])
      setDiscount(0)
      setPointsToRedeem(0)
      setSelectedCustomerId(null)
      setOpenBillCount((prev) => prev + 1)
      setSnackbar({
        open: true,
        message: `Open bill "${label || 'Tanpa label'}" berhasil disimpan`,
        severity: 'success'
      })
    } else {
      setSnackbar({
        open: true,
        message: res.error || 'Gagal menyimpan open bill',
        severity: 'error'
      })
    }
  }

  const handleRecallOpenBill = async (billId: string): Promise<void> => {
    const res = await window.api.db.openBills.getById(billId)
    if (!res.success || !res.data?.items) {
      setSnackbar({ open: true, message: 'Gagal memuat open bill', severity: 'error' })
      return
    }

    const bill = res.data

    // If there are items in the cart, release their reservations first
    if (cartItems.length > 0) {
      await releaseAllReservedItems()
    }

    // Restore cart items from open bill
    const restoredItems: CartItem[] = (bill.items ?? []).map((item) => ({
      id: item.cartItemId,
      productId: item.productId,
      name: item.productName ?? '',
      sku: item.productSku ?? '',
      category: '',
      unit: item.uomCode ?? 'PCS',
      cost: '0',
      weight: item.weight ?? '0',
      price: parseFloat(item.unitPrice),
      quantity: item.quantity,
      displayQuantity: item.displayQuantity ?? item.quantity,
      uomId: item.uomId ?? null,
      uomCode: item.uomCode ?? undefined,
      priceCategoryId: item.priceCategoryId ?? undefined,
      priceCategoryName: item.priceCategoryName ?? undefined,
      conversionFactor: item.conversionFactor,
      baseQuantity: item.baseQuantity,
      total: parseFloat(item.unitPrice) * item.quantity
    }))

    setCartItems(restoredItems)
    setDiscount(parseFloat(bill.discount) || 0)
    setSelectedCustomerId(bill.customerId ?? null)

    if (bill.salesId) {
      setSelectedSalesId(bill.salesId)
    }

    // Delete the open bill (it's now in the cart)
    await window.api.db.openBills.delete(billId)
    setOpenBillCount((prev) => Math.max(0, prev - 1))
    setOpenBillDialogOpen(false)

    setSnackbar({
      open: true,
      message: `Open bill "${bill.label || 'Tanpa label'}" berhasil di-recall`,
      severity: 'success'
    })
  }

  const handleDeleteOpenBill = async (billId: string): Promise<void> => {
    await window.api.db.openBills.delete(billId)
    setOpenBills((prev) => prev.filter((b) => b.id !== billId))
    setOpenBillCount((prev) => Math.max(0, prev - 1))
  }

  const openSaveOpenBillDialog = (): void => {
    if (cartItems.length === 0) return
    setOpenBillDialogMode('save')
    setOpenBillDialogOpen(true)
  }

  const openListOpenBillDialog = (): void => {
    setOpenBillDialogMode('list')
    setOpenBillDialogOpen(true)
    void loadOpenBills()
  }

  // Expense handling
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseLoading, setExpenseLoading] = useState(false)

  const handleExpenseSubmit = async (data: ExpenseFormData): Promise<void> => {
    if (!currentShift?.id) {
      setSnackbar({ open: true, message: 'Shift belum dibuka', severity: 'error' })
      return
    }

    try {
      setExpenseLoading(true)
      const total = data.quantity * data.price
      
      const response = await window.api.db.expenses.create({
        shiftId: currentShift.id,
        categoryId: data.categoryId || undefined,
        storeId: currentShift.storeId || defaultStoreId || '',
        item: data.item,
        quantity: data.quantity,
        price: data.price.toString(),
        total: total.toString(),
        description: data.description,
        createdBy: userName ?? undefined
      })

      if (response.success) {
        setSnackbar({ open: true, message: 'Pengeluaran berhasil dicatat', severity: 'success' })
        setExpenseDialogOpen(false)
      } else {
        setSnackbar({ open: true, message: response.error ?? 'Gagal mencatat pengeluaran', severity: 'error' })
      }
    } catch (error) {
      console.error('Failed to create expense:', error)
      setSnackbar({ open: true, message: 'Terjadi kesalahan saat mencatat pengeluaran', severity: 'error' })
    } finally {
      setExpenseLoading(false)
    }
  }

  // Keyboard shortcut for Expense (F6 of Ctrl+E)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isInputLike =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.getAttribute('role') === 'textbox'

      // Allow Ctrl+Enter / F9 to work even when typing, but avoid intercepting other keys
      if (isInputLike && 
          !(event.ctrlKey && event.key === 'Enter') && 
          event.key !== 'F9' && 
          event.key !== 'F6' // Allow F6 from input
         ) {
        return
      }

      if (event.key === 'F6' || (event.ctrlKey && event.key.toLowerCase() === 'e')) {
        event.preventDefault()
        setExpenseDialogOpen(true)
        return
      }

      if (event.key === 'F7') {
        event.preventDefault()
        openSaveOpenBillDialog()
        return
      }

      if (event.key === 'F8') {
        event.preventDefault()
        openListOpenBillDialog()
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
            {currentStoreName && (
              <Chip
                label={currentStoreName}
                color="info"
                size="small"
                variant="outlined"
              />
            )}
            <Chip
              label={`Shift: ${currentShift?.userName ?? 'Kasir'}`}
              color="success"
              size="small"
              variant="outlined"
            />
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={openListOpenBillDialog}
            >
              Open Bill{openBillCount > 0 ? ` (${openBillCount})` : ''}
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={() => setExpenseDialogOpen(true)}>
              Pengeluaran
            </Button>
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

        {/* Customer and Sales Section */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' }
          }}
        >
          {/* Customer Column */}
          <Box sx={{ flex: 1, width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.5
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                Pelanggan <Kbd keys={['F3']} size="small" />
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => window.api?.openMasterCustomerWindow?.()}
                sx={{ fontSize: '0.75rem', p: 0, minWidth: 'auto', height: 20 }}
              >
                + Baru
              </Button>
            </Box>
            <CustomerSelector
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onChange={setSelectedCustomerId}
              inputRef={customerInputRef}
            />
          </Box>

          {/* Divider visible only on md+ */}
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Sales Person Column */}
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}
            >
              Sales Person *
            </Typography>
            <FormControl fullWidth size="small" error={!selectedSalesId}>
              <InputLabel>Pilih Sales</InputLabel>
              <Select
                value={selectedSalesId}
                label="Pilih Sales"
                onChange={(e) => setSelectedSalesId(e.target.value)}
              >
                {salesPersons.map((sp) => (
                  <MenuItem key={sp.id} value={sp.id}>
                    {sp.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
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
            onRemove={handleRemoveItem}
            onEdit={handleEditCartItem}
            onChangeDiscount={handleChangeDiscount}
            onCheckout={handleCheckout}
            onSaveOpenBill={openSaveOpenBillDialog}
            discountInputRef={discountInputRef}
            customerPoints={customerPoints}
            pointsToRedeem={pointsToRedeem}
            pointRedemptionValue={pointSettings?.redemptionValue ?? 10}
            minPointsToRedeem={pointSettings?.minRedemption ?? 100}
            onPointsRedeemChange={pointSettings?.isActive ? setPointsToRedeem : undefined}
          />
        </Box>

        <Dialog
          open={productDialogOpen}
          onClose={() => setProductDialogOpen(false)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle>Cari produk</DialogTitle>
          <DialogContent dividers sx={{ height: 650 }}>
            <ProductBrowser products={products} onAdd={handleAddToCart} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProductDialogOpen(false)}>Tutup</Button>
          </DialogActions>
        </Dialog>

        <ProductSelectModal
          open={productSelectModalOpen}
          product={selectedProduct as ProductForSelection | null}
          storeId={currentShift?.storeId ?? defaultStoreId}
          enableMultiUomPricing={featureFlags.enableMultiUomPricing}
          editMode={!!editingCartItem}
          initialQuantity={editingCartItem?.quantity}
          initialUomCode={editingCartItem?.uomCode}
          initialPriceCategoryId={editingCartItem?.priceCategoryId}
          onClose={() => {
            setProductSelectModalOpen(false)
            setSelectedProduct(null)
            setEditingCartItem(null)
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
          onConfirm={async (data) => {
            await releaseAllReservedItems()
            // Auto-delete all open bills for this shift
            if (currentShift?.id) {
              await window.api.db.openBills.deleteByShiftId(currentShift.id)
              setOpenBillCount(0)
              setOpenBills([])
            }
            await closeShift(data)
          }}
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

        <ExpenseForm
          open={expenseDialogOpen}
          onClose={() => setExpenseDialogOpen(false)}
          onSubmit={handleExpenseSubmit}
          loading={expenseLoading}
        />

        <OpenBillDialog
          open={openBillDialogOpen}
          mode={openBillDialogMode}
          onClose={() => setOpenBillDialogOpen(false)}
          onSave={handleSaveOpenBill}
          onRecall={handleRecallOpenBill}
          onDelete={handleDeleteOpenBill}
          bills={openBills}
          loading={openBillLoading}
          cartItemCount={cartItems.length}
        />
      </Box>
    </Box>
  )
}
