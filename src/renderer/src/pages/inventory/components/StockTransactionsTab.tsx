import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Search as SearchIcon,
  ArrowUpward as InIcon,
  ArrowDownward as OutIcon
} from '@mui/icons-material'
import { StockTransaction } from 'src/preload/api/inventory'

interface StockTransactionsTabProps {
  data: (StockTransaction & { productName: string; storeName: string })[]
  onRefresh: () => void
}

const transactionTypeColors = {
  INBOUND: { color: '#4caf50', label: 'Inbound' },
  OUTBOUND: { color: '#f44336', label: 'Outbound' },
  TRANSFER_IN: { color: '#2196f3', label: 'Transfer In' },
  TRANSFER_OUT: { color: '#ff9800', label: 'Transfer Out' },
  ADJUSTMENT: { color: '#9c27b0', label: 'Adjustment' },
  SALE: { color: '#795548', label: 'Sale' }
}

export default function StockTransactionsTab({
  data
}: StockTransactionsTabProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  const filteredData = useMemo(() => {
    let filtered = data

    // Filter by type
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((item) => item.type === typeFilter)
    }

    // Filter by search text
    if (searchText) {
      const lowerSearch = searchText.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(lowerSearch) ||
          item.storeName.toLowerCase().includes(lowerSearch) ||
          item.reference?.toLowerCase().includes(lowerSearch)
      )
    }

    return filtered
  }, [data, searchText, typeFilter])

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage
    return filteredData.slice(start, start + rowsPerPage)
  }, [filteredData, page, rowsPerPage])

  const handleChangePage = (_event: unknown, newPage: number): void => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const formatQuantity = (type: string, quantity: number): string => {
    const isNegative = type === 'OUTBOUND' || type === 'TRANSFER_OUT' || type === 'SALE'
    return `${isNegative ? '-' : '+'}${Math.abs(quantity)}`
  }

  const getTypeIcon = (type: string): React.ReactElement | undefined => {
    switch (type) {
      case 'INBOUND':
      case 'TRANSFER_IN':
        return <InIcon sx={{ fontSize: 16 }} />
      case 'OUTBOUND':
      case 'TRANSFER_OUT':
      case 'SALE':
        return <OutIcon sx={{ fontSize: 16 }} />
      default:
        return undefined
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <TextField
            size="small"
            placeholder="Cari transaksi..."
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

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={typeFilter}
              label="Jenis Transaksi"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="ALL">Semua Jenis</MenuItem>
              {Object.entries(transactionTypeColors).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {value.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Menampilkan {paginatedData.length} dari {filteredData.length} transaksi
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Tanggal</TableCell>
              <TableCell>Jenis</TableCell>
              <TableCell>Produk</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell align="right">Jumlah</TableCell>
              <TableCell>Referensi</TableCell>
              <TableCell>Dilakukan Oleh</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={getTypeIcon(row.type)}
                    label={
                      transactionTypeColors[row.type as keyof typeof transactionTypeColors]?.label
                    }
                    sx={{
                      backgroundColor:
                        transactionTypeColors[row.type as keyof typeof transactionTypeColors]?.color,
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell>{row.storeName}</TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      color:
                        row.type === 'OUTBOUND' ||
                        row.type === 'TRANSFER_OUT' ||
                        row.type === 'SALE'
                          ? 'error.main'
                          : 'success.main',
                      fontWeight: 'bold'
                    }}
                  >
                    {formatQuantity(row.type, row.quantity)}
                  </Typography>
                </TableCell>
                <TableCell>{row.reference || '-'}</TableCell>
                <TableCell>{row.performedBy || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  )
}
