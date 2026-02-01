import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import { globalAlert } from '../../../lib/globalAlert'
import ProductInfoTab from './tabs/ProductInfoTab'
import ProductPricingTab from './tabs/ProductPricingTab'
import ProductStockTab from './tabs/ProductStockTab'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  weight?: string
  categoryId?: string
}

interface ProductDetailProps {
  productId: string
  activeTab: string
  availableTabs: { key: string; label: string }[]
  onTabChange: (tab: string) => void
  onClose: () => void
  onProductUpdated: () => void
}

export default function ProductDetail({
  productId,
  activeTab,
  availableTabs,
  onTabChange,
  onClose,
  onProductUpdated
}: ProductDetailProps): React.JSX.Element {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const loadProduct = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await window.api.db.products.getById(productId)
      if (res.data) {
        setProduct({
          id: res.data.id,
          sku: res.data.sku,
          name: res.data.name,
          unit: res.data.unit ?? 'PCS',
          cost: res.data.cost ?? '0',
          weight: res.data.weight ?? '0',
          categoryId: res.data.categoryId ?? undefined
        })
      }
    } catch (error) {
      console.error('Failed to load product', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductUpdated = (): void => {
    loadProduct()
    onProductUpdated()
  }

  const handleDelete = async (): Promise<void> => {
    const confirmed = await globalAlert.confirm(
      'Apakah Anda yakin ingin menghapus produk ini secara permanen?'
    )
    if (!confirmed) return

    try {
      setLoading(true)
      const res = await window.api.db.products.delete(productId)
      if (res.success) {
        globalAlert.success('Produk berhasil dihapus')
        onProductUpdated() // Refresh list
        onClose() // Close detail
      } else {
        globalAlert.error(res.error ?? 'Gagal menghapus produk')
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to delete product', error)
      globalAlert.error('Gagal menghapus produk')
      setLoading(false)
    }
  }

  // Ensure activeTab is valid
  const currentTab = availableTabs.find((t) => t.key === activeTab)
    ? activeTab
    : availableTabs[0]?.key || 'info'

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    )
  }

  if (!product) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography color="text.secondary">Produk tidak ditemukan</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={600}>
              {product.name}
            </Typography>
            <Chip label={product.unit} size="small" color="primary" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            SKU: {product.sku}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" color="error" onClick={handleDelete} title="Hapus Produk">
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, v) => onTabChange(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {availableTabs.map((tab) => (
          <Tab key={tab.key} label={tab.label} value={tab.key} />
        ))}
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {currentTab === 'info' && (
          <ProductInfoTab product={product} onUpdated={handleProductUpdated} />
        )}
        {currentTab === 'pricing' && <ProductPricingTab productId={productId} />}
        {currentTab === 'stock' && (
          <ProductStockTab productId={productId} productUnit={product.unit} />
        )}
      </Box>
    </Box>
  )
}
