import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'

type StockItem = {
  id: string
  productCode: string
  productName: string
  location: string
  qtyOnHand: number
  minStock: number
}

export default function WarehouseStocksPage(): React.JSX.Element {
  const [items, setItems] = useState<StockItem[]>([
    {
      id: 's1',
      productCode: 'PRD-001',
      productName: 'Premium Dog Food 10kg',
      location: 'Main Warehouse',
      qtyOnHand: 42,
      minStock: 10
    },
    {
      id: 's2',
      productCode: 'PRD-002',
      productName: 'Cat Kibble Salmon 5kg',
      location: 'Main Warehouse',
      qtyOnHand: 15,
      minStock: 8
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [adjustQty, setAdjustQty] = useState<string>('0')
  const [note, setNote] = useState('')

  const openAdjust = (item: StockItem): void => {
    setSelected(item)
    setAdjustQty('0')
    setNote('')
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const handleApply = (): void => {
    if (!selected) return
    const delta = Number(adjustQty)
    if (!Number.isFinite(delta) || delta === 0) {
      setDialogOpen(false)
      return
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, qtyOnHand: Math.max(0, item.qtyOnHand + delta) } : item
      )
    )
    setDialogOpen(false)
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Warehouse - Stocks
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1">Current Stock</Typography>
        <Typography variant="body2" color="text.secondary">
          Adjust quantities when receiving goods or doing corrections.
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Location</TableCell>
            <TableCell align="right">On Hand</TableCell>
            <TableCell align="right">Min Stock</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No stock data
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const belowMin = item.qtyOnHand < item.minStock
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Stack spacing={0.3}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.productCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.productName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell align="right">{item.qtyOnHand}</TableCell>
                  <TableCell align="right">{item.minStock}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={belowMin ? 'Below Min' : 'OK'}
                      color={belowMin ? 'error' : 'success'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openAdjust(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Adjust Stock</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {selected.productCode} - {selected.productName}
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Current on hand: {selected.qtyOnHand}
              </Typography>
            </Box>
          )}

          <TextField
            margin="normal"
            label="Adjustment (+/-)"
            type="number"
            fullWidth
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Note"
            fullWidth
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleApply} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
