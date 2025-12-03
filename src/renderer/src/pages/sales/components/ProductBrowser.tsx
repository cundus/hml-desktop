import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import Kbd from '../../../components/Kbd'

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  unit: string
  cost: string
  price: number
}

export type ProductBrowserProps = {
  products: Product[]
  onAdd: (product: Product) => void
}

export default function ProductBrowser({
  products,
  onAdd
}: ProductBrowserProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Auto-focus search input when component mounts (dialog opens)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Reset selection when search or category changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search, activeCategory])

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  )

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesSearch =
          !search.trim() ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = !activeCategory || p.category === activeCategory
        return matchesSearch && matchesCategory
      }),
    [products, search, activeCategory]
  )

  const handleCategoryClick = (category: string | null): void => {
    setActiveCategory((prev) => (prev === category ? null : category))
  }

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (filtered.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          onAdd(filtered[selectedIndex])
        }
      }
    },
    [filtered, selectedIndex, onAdd]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filtered.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, filtered.length])

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}
      onKeyDown={handleKeyDown}
    >
      <Box>
        <Typography variant="h6" gutterBottom>
          Produk
        </Typography>
        <TextField
          fullWidth
          placeholder="Cari berdasarkan nama atau SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputRef={searchInputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          size="small"
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Kbd keys={['↑']} size="small" />
          <Kbd keys={['↓']} size="small" />
          <span>Navigasi</span>
          <span>•</span>
          <Kbd keys={['Enter']} size="small" />
          <span>Pilih</span>
        </Typography>
        {categories.length > 0 && (
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip
              label="Semua"
              size="small"
              clickable
              color={!activeCategory ? 'primary' : 'default'}
              onClick={() => handleCategoryClick(null)}
            />
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                size="small"
                clickable
                color={activeCategory === cat ? 'primary' : 'default'}
                onClick={() => handleCategoryClick(cat)}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Tidak ada produk ditemukan.
          </Typography>
        ) : (
          <List dense ref={listRef}>
            {filtered.map((product, index) => (
              <ListItemButton
                key={product.id}
                selected={index === selectedIndex}
                onClick={() => onAdd(product)}
                divider
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <ListItemText
                  primary={product.name}
                  secondary={`${product.sku} • ${product.category}`}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight="bold">
                    {product.price.toLocaleString('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </Typography>
                  <IconButton
                    edge="end"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAdd(product)
                    }}
                    size="small"
                  >
                    <AddShoppingCartIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}
