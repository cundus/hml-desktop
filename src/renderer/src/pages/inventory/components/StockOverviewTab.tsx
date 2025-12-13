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
import { Search as SearchIcon, Warning as WarningIcon, Add as AddIcon } from '@mui/icons-material'
import { StockOverviewItem } from 'src/preload/api/inventory'

interface StockOverviewTabProps {
  data: StockOverviewItem[]
  onRefresh: () => void
}

export default function StockOverviewTab({ data }: StockOverviewTabProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

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
      width: 120,
      type: 'number',
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => (
        <Typography variant="body2">
          {params.value} {params.row.unit}
        </Typography>
      )
    },
    {
      field: 'reservedQuantity',
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
      width: 120,
      type: 'number',
      renderCell: (params: GridRenderCellParams<StockOverviewItem>) => {
        const value = params.value as number
        const isLow = value < params.row.lowStockThreshold

        return (
          <Typography
            variant="body2"
            color={isLow ? 'error' : 'success.main'}
            sx={{ fontWeight: isLow ? 'bold' : 'normal' }}
          >
            {value} {params.row.unit}
          </Typography>
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
        <Tooltip title="Penyesuaian Cepat">
          <IconButton size="small" onClick={() => handleQuickAdjust(params.row)}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      )
    }
  ]

  const handleQuickAdjust = async (item: StockOverviewItem): Promise<void> => {
    // TODO: Implement quick adjustment dialog
    console.log('Quick adjust for:', item)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExport = async (): Promise<void> => {
    setLoading(true)
    try {
      // TODO: Implement export functionality
      console.log('Exporting stock overview...')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(false)
    }
  }

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
