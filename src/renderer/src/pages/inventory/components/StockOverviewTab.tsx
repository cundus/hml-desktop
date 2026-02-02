import { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material'
import { StockOverviewItem } from 'src/preload/api/inventory'
import { ProductUom } from 'src/preload/api/pricing'


interface StockOverviewTabProps {
  data: StockOverviewItem[]
  uoms: ProductUom[]
  onRefresh: () => void
  onQuickAdjust: (productId: string, storeId: string) => void
}

export default function StockOverviewTab({
  data,
  uoms,
  onQuickAdjust
}: StockOverviewTabProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [loading] = useState(false)
  const navigate = useNavigate()

  const filteredData = useMemo(() => {
    if (!searchText) return data

    const lowerSearch = searchText.toLowerCase()
    return data.filter(
      (item) =>
        item.productName.toLowerCase().includes(lowerSearch) ||
        item.productSku.toLowerCase().includes(lowerSearch) ||
        item.unit.toLowerCase().includes(lowerSearch)
    )
  }, [data, searchText])

  const lowStockItems = useMemo(() => {
    return filteredData.filter((item) => item.isLowStock)
  }, [filteredData])

  const handleViewDetail = (item: StockOverviewItem): void => {
    navigate(`/inventory/product/${item.productId}?storeId=${item.storeId}`)
  }

  const handleQuickAdjust = async (item: StockOverviewItem): Promise<void> => {
    onQuickAdjust(item.productId, item.storeId)
  }

  const formatSmartStock = (qty: number, productId: string, baseUnit: string): string => {
    if (qty === 0) return `0 ${baseUnit}`
    
    // Get UOMs for this product, sorted by conversion factor descending (biggest first)
    const productUoms = uoms
      .filter((u) => u.productId === productId && u.conversionFactor > 1)
      .sort((a, b) => b.conversionFactor - a.conversionFactor)
      
    if (productUoms.length === 0) return `${qty} ${baseUnit}`
    
    let remainingQty = qty
    const parts: string[] = []
    
    for (const uom of productUoms) {
      if (remainingQty >= uom.conversionFactor) {
        const count = Math.floor(remainingQty / uom.conversionFactor)
        remainingQty = remainingQty % uom.conversionFactor
        parts.push(`${count} ${uom.uomCode}`)
      }
    }
    
    if (remainingQty > 0 || parts.length === 0) {
      parts.push(`${remainingQty} ${baseUnit}`)
    }
    
    return parts.join(' ')
  }

  const columns: GridColDef[] = [
    {
      field: 'productName',
      headerName: 'Nama Produk',
      flex: 2,
      minWidth: 200
    },
    {
      field: 'productSku',
      headerName: 'SKU',
      width: 120
    },
    {
      field: 'quantity',
      headerName: 'Total Stok',
      width: 150,
      type: 'number',
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => (
        <Tooltip title={`${params.value} ${params.row.unit}`}>
          <Typography variant="body2" noWrap>
             {formatSmartStock(params.value as number, params.row.productId, params.row.unit)}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'orderedQuantity',
      headerName: 'Dipesan',
      width: 120,
      type: 'number',
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => (
        <Typography variant="body2" color="text.secondary">
          {params.value} {params.row.unit}
        </Typography>
      )
    },
    {
      field: 'availableQuantity',
      headerName: 'Tersedia',
      width: 150,
      type: 'number',
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => {
        const value = params.value as number
        const isLow = value < params.row.lowStockThreshold

        return (
          <Tooltip title={`${value} ${params.row.unit}`}>
            <Typography
              variant="body2"
              color={isLow ? 'error' : 'success.main'}
              sx={{ fontWeight: isLow ? 'bold' : 'normal' }}
              noWrap
            >
              {formatSmartStock(value, params.row.productId, params.row.unit)}
            </Typography>
          </Tooltip>
        )
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => {
        if (params.row.isLowStock) {
          return <Chip icon={<WarningIcon />} label="Stok Rendah" color="error" size="small" />
        }
        return <Chip label="Stok Ada" color="success" size="small" />
      }
    },
    {
      field: 'actions',
      headerName: 'Aksi',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => (
        <Box>
          <Tooltip title="Detail Stok">
            <IconButton size="small" onClick={() => handleViewDetail(params.row)} color="primary">
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Penyesuaian Cepat">
            <IconButton size="small" onClick={() => handleQuickAdjust(params.row)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Cari produk..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ width: 300 }}
          />

          {lowStockItems.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${lowStockItems.length} Item Stok Rendah`}
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary">
          Menampilkan {filteredData.length} dari {data.length} produk
        </Typography>
      </Box>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={filteredData}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none'
            }
          }}
        />
      </Box>
    </Box>
  )
}
