import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

type PricingItem = {
  id: string
  productId: string
  productCode: string
  productName: string
  baseCost: number
  marginPct: number
  sellingPrice: number
  baseUomCode: string | null
  uomCount: number
}

function computeSelling(baseCost: number, marginPct: number): number {
  return Math.round(baseCost * (1 + marginPct / 100))
}

export default function WarehousePricingListPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [items, setItems] = useState<PricingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadProducts = async (): Promise<void> => {
      setLoading(true)
      try {
        const res = await window.api.db.products.getAll()
        const products = res.data ?? []

        const mapped: PricingItem[] = []

        for (const p of products) {
          const cost = Number(p.cost ?? '0') || 0
          let margin = 20
          let sellingPrice = computeSelling(cost, margin)
          let baseUomCode = p.unit ?? null
          let uomCount = 0

          try {
            const uomsRes = await window.api.db.pricing.getProductUomsByProduct(p.id)
            const uoms = uomsRes.data ?? []
            uomCount = uoms.length
            const baseUom = uoms.find((u) => u.isBaseUnit) ?? null
            baseUomCode = baseUom?.uomCode ?? p.unit ?? null

            if (baseUom?.uomId) {
              const pricesRes = await window.api.db.pricing.getCategoryPrices({
                productId: p.id,
                uomId: baseUom.uomId
              })
              const catPrices = pricesRes.data ?? []
              const retail = catPrices.find((cp) => cp.priceCategoryId === 'RETAIL')
              if (retail) {
                const retailPrice = Number(retail.price ?? '0') || 0
                sellingPrice = retailPrice
                if (cost > 0) {
                  margin = Math.round((retailPrice / cost - 1) * 100)
                }
              }
            }
          } catch (error) {
            console.error('Failed to enrich pricing item', error)
          }

          mapped.push({
            id: p.id,
            productId: p.id,
            productCode: p.sku,
            productName: p.name,
            baseCost: cost,
            marginPct: margin,
            sellingPrice,
            baseUomCode,
            uomCount
          })
        }

        setItems(mapped)
      } catch (error) {
        console.error('Failed to load products for pricing', error)
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [])

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return item.productCode.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q)
  })

  const handleRowClick = (productId: string): void => {
    navigate(`/pricing/products/${productId}`)
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Product Pricing
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Klik produk untuk mengatur UOM dan harga per kategori.
        </Typography>
        <TextField
          size="small"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Nama Produk</TableCell>
              <TableCell>UOM</TableCell>
              <TableCell align="right">Harga Modal</TableCell>
              <TableCell align="right">Margin</TableCell>
              <TableCell align="right">Harga Jual</TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {search ? 'Tidak ada produk yang cocok' : 'Tidak ada data produk'}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(item.productId)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.productCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.productName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label={item.baseUomCode ?? '-'}
                        size="small"
                        color={item.uomCount > 0 ? 'primary' : 'default'}
                        variant={item.uomCount > 0 ? 'filled' : 'outlined'}
                      />
                      {item.uomCount > 1 && (
                        <Typography variant="caption" color="text.secondary">
                          +{item.uomCount - 1}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.baseCost)}</TableCell>
                  <TableCell align="right">{item.marginPct}%</TableCell>
                  <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                  <TableCell>
                    <ChevronRightIcon fontSize="small" color="action" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
