import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import useAuth from '../../hooks/useAuth'
import ProductList from './components/ProductList'
import ProductDetail from './components/ProductDetail'

export default function ProductManagementPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()

  // URL-synced state
  const selectedProductId = searchParams.get('selected') || null
  const activeTab = searchParams.get('tab') || 'info'

  // Local state for list data
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Permissions
  const canViewInfo = hasPermission('master.product.manage')
  const canViewPricing = hasPermission('pricing.products')
  const canViewStock = hasPermission('inventory.manage')

  // Load products
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await window.api.db.products.getAll()
      setProducts(res.data ?? [])
    } catch (error) {
      console.error('Failed to load products', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle product selection
  const handleSelectProduct = useCallback(
    (productId: string | null) => {
      if (productId) {
        setSearchParams({ selected: productId, tab: activeTab })
        const idx = products.findIndex((p) => p.id === productId)
        setSelectedIndex(idx)
      } else {
        setSearchParams({})
        setSelectedIndex(-1)
      }
    },
    [activeTab, products, setSearchParams]
  )

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: string) => {
      if (selectedProductId) {
        setSearchParams({ selected: selectedProductId, tab })
      }
    },
    [selectedProductId, setSearchParams]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = Math.min(selectedIndex + 1, products.length - 1)
        if (products[nextIndex]) {
          handleSelectProduct(products[nextIndex].id)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = Math.max(selectedIndex - 1, 0)
        if (products[prevIndex]) {
          handleSelectProduct(products[prevIndex].id)
        }
      } else if (e.key === 'Escape') {
        handleSelectProduct(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, products, handleSelectProduct])

  // Sync selectedIndex when URL changes
  useEffect(() => {
    if (selectedProductId) {
      const idx = products.findIndex((p) => p.id === selectedProductId)
      setSelectedIndex(idx)
    } else {
      setSelectedIndex(-1)
    }
  }, [selectedProductId, products])

  // Determine available tabs based on permissions
  const availableTabs = [
    canViewInfo && { key: 'info', label: 'Info Produk' },
    canViewPricing && { key: 'pricing', label: 'Harga' },
    canViewStock && { key: 'stock', label: 'Stok' }
  ].filter(Boolean) as { key: string; label: string }[]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>
        Dashboard Produk
      </Typography>

      {/* Product List - Full Height */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ProductList
          products={products}
          loading={loading}
          selectedProductId={selectedProductId}
          onSelectProduct={handleSelectProduct}
          onRefresh={loadProducts}
        />
      </Box>

      {/* Product Detail Modal */}
      <Dialog
        open={!!selectedProductId}
        onClose={() => handleSelectProduct(null)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: '85vh',
            maxHeight: '85vh'
          }
        }}
      >
        <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {selectedProductId && (
            <ProductDetail
              productId={selectedProductId}
              activeTab={activeTab}
              availableTabs={availableTabs}
              onTabChange={handleTabChange}
              onClose={() => handleSelectProduct(null)}
              onProductUpdated={loadProducts}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

