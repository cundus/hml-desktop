import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
// import Paper from '@mui/material/Paper'
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
import EditIcon from '@mui/icons-material/Edit'

type PricingItem = {
  id: string
  productCode: string
  productName: string
  baseCost: number
  marginPct: number
  sellingPrice: number
}

function computeSelling(baseCost: number, marginPct: number): number {
  return Math.round(baseCost * (1 + marginPct / 100))
}

export default function WarehousePricingPage(): React.JSX.Element {
  const [items, setItems] = useState<PricingItem[]>([
    {
      id: 'pr1',
      productCode: 'PRD-001',
      productName: 'Premium Dog Food 10kg',
      baseCost: 250000,
      marginPct: 20,
      sellingPrice: computeSelling(250000, 20)
    },
    {
      id: 'pr2',
      productCode: 'PRD-002',
      productName: 'Cat Kibble Salmon 5kg',
      baseCost: 150000,
      marginPct: 25,
      sellingPrice: computeSelling(150000, 25)
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<PricingItem | null>(null)
  const [baseCost, setBaseCost] = useState('0')
  const [marginPct, setMarginPct] = useState('0')

  const openEdit = (item: PricingItem): void => {
    setSelected(item)
    setBaseCost(String(item.baseCost))
    setMarginPct(String(item.marginPct))
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const handleSave = (): void => {
    if (!selected) return
    const cost = Number(baseCost) || 0
    const margin = Number(marginPct) || 0
    const price = computeSelling(cost, margin)

    setItems((prev) =>
      prev.map((item) =>
        item.id === selected.id
          ? { ...item, baseCost: cost, marginPct: margin, sellingPrice: price }
          : item
      )
    )
    setDialogOpen(false)
  }

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Warehouse - Pricing
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1">Product Pricing</Typography>
        <Typography variant="body2" color="text.secondary">
          Adjust margins to update selling prices.
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell align="right">Base Cost</TableCell>
            <TableCell align="right">Margin %</TableCell>
            <TableCell align="right">Selling Price</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No pricing data
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
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
                <TableCell align="right">{formatCurrency(item.baseCost)}</TableCell>
                <TableCell align="right">{item.marginPct}%</TableCell>
                <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Adjust Pricing</DialogTitle>
        <DialogContent>
          {selected && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {selected.productCode} - {selected.productName}
              </Typography>
            </Box>
          )}

          <TextField
            margin="normal"
            label="Base Cost"
            type="number"
            fullWidth
            value={baseCost}
            onChange={(e) => setBaseCost(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Margin %"
            type="number"
            fullWidth
            value={marginPct}
            onChange={(e) => setMarginPct(e.target.value)}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Selling price will be recalculated as base cost × (1 + margin %).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
