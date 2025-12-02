import { useMemo, useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'

export type Product = {
  id: string
  name: string
  sku: string
  category: string
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input when component mounts (dialog opens)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
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
          <List dense>
            {filtered.map((product) => (
              <ListItem key={product.id} divider>
                <ListItemText
                  primary={product.name}
                  secondary={`${product.sku} • ${product.category}`}
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight="bold">
                      {product.price.toLocaleString('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                      })}
                    </Typography>
                    <IconButton
                      edge="end"
                      color="primary"
                      onClick={() => onAdd(product)}
                      size="small"
                    >
                      <AddShoppingCartIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}
