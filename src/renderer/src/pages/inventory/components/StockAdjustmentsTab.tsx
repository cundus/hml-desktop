import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TablePagination,
  IconButton,
  Tooltip
} from '@mui/material'
import { Search as SearchIcon, Visibility as ViewIcon } from '@mui/icons-material'
import { StockAdjustment } from 'src/preload/api/inventory'

interface StockAdjustmentsTabProps {
  data: (StockAdjustment & { productName: string; storeName: string })[]
  onRefresh: () => void
}

export default function StockAdjustmentsTab({
  data
}: StockAdjustmentsTabProps): React.ReactElement {
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const filteredData = useMemo(() => {
    if (!searchText) return data

    const lowerSearch = searchText.toLowerCase()
    return data.filter(
      (item) =>
        item.productName.toLowerCase().includes(lowerSearch) ||
        item.storeName.toLowerCase().includes(lowerSearch) ||
        item.note?.toLowerCase().includes(lowerSearch) ||
        item.performedBy.toLowerCase().includes(lowerSearch)
    )
  }, [data, searchText])

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

  const formatDifference = (difference: number): { text: string; color: string } => {
    const isNegative = difference < 0
    return {
      text: `${isNegative ? '-' : '+'}${Math.abs(difference)}`,
      color: isNegative ? 'error.main' : 'success.main'
    }
  }

  const handleViewDetails = (adjustment: StockAdjustment): void => {
    // TODO: Implement view details dialog
    console.log('View details for:', adjustment)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Cari penyesuaian..."
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

        <Typography variant="body2" color="text.secondary">
          Menampilkan {paginatedData.length} dari {filteredData.length} penyesuaian
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Tanggal</TableCell>
              <TableCell>Produk</TableCell>
              <TableCell>Toko</TableCell>
              <TableCell align="right">Penyesuaian</TableCell>
              <TableCell>Catatan</TableCell>
              <TableCell>Dilakukan Oleh</TableCell>
              <TableCell>Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const diff = formatDifference(row.difference)
              return (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.storeName}</TableCell>
                  <TableCell align="right">
                    <Typography
                      sx={{
                        color: diff.color,
                        fontWeight: 'bold'
                      }}
                    >
                      {diff.text}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.note ? (
                      <Tooltip title={row.note}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row.note}
                        </Typography>
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{row.performedBy}</TableCell>
                  <TableCell>
                    <Tooltip title="Lihat Detail">
                      <IconButton size="small" onClick={() => handleViewDetails(row)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
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
