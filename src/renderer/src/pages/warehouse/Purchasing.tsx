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
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'

type PurchaseOrder = {
  id: string
  poNumber: string
  supplier: string
  date: string
  status: 'Draft' | 'Ordered' | 'Received'
  totalItems: number
  totalQty: number
}

export default function WarehousePurchasingPage(): React.JSX.Element {
  const [orders, setOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po1',
      poNumber: 'PO-001',
      supplier: 'Pet Supplies Co.',
      date: '2025-01-10',
      status: 'Received',
      totalItems: 3,
      totalQty: 40
    },
    {
      id: 'po2',
      poNumber: 'PO-002',
      supplier: 'Animal Care Wholesale',
      date: '2025-01-14',
      status: 'Ordered',
      totalItems: 2,
      totalQty: 25
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [supplier, setSupplier] = useState('')
  const [date, setDate] = useState('')
  const [totalItems, setTotalItems] = useState('0')
  const [totalQty, setTotalQty] = useState('0')

  const resetForm = (): void => {
    setSupplier('')
    setDate('')
    setTotalItems('0')
    setTotalQty('0')
  }

  const openCreate = (): void => {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (order: PurchaseOrder): void => {
    setEditing(order)
    setSupplier(order.supplier)
    setDate(order.date)
    setTotalItems(String(order.totalItems))
    setTotalQty(String(order.totalQty))
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const handleSave = (): void => {
    const parsedItems = Number(totalItems) || 0
    const parsedQty = Number(totalQty) || 0

    if (!supplier || !date) {
      setDialogOpen(false)
      return
    }

    if (editing) {
      setOrders((prev) =>
        prev.map((po) =>
          po.id === editing.id
            ? { ...po, supplier, date, totalItems: parsedItems, totalQty: parsedQty }
            : po
        )
      )
    } else {
      const nextNumber = orders.length + 1
      const newOrder: PurchaseOrder = {
        id: `po${Date.now()}`,
        poNumber: `PO-${String(nextNumber).padStart(3, '0')}`,
        supplier,
        date,
        status: 'Draft',
        totalItems: parsedItems,
        totalQty: parsedQty
      }
      setOrders((prev) => [newOrder, ...prev])
    }

    setDialogOpen(false)
  }

  const toggleStatus = (order: PurchaseOrder): void => {
    const nextStatus: PurchaseOrder['status'] =
      order.status === 'Draft' ? 'Ordered' : order.status === 'Ordered' ? 'Received' : 'Received'

    setOrders((prev) => prev.map((po) => (po.id === order.id ? { ...po, status: nextStatus } : po)))
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Warehouse - Purchasing
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1">Purchase Orders</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Purchase
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>PO Number</TableCell>
            <TableCell>Supplier</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Items</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No purchase orders
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>{order.poNumber}</TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell align="right">{order.totalItems}</TableCell>
                <TableCell align="right">{order.totalQty}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={order.status}
                    color={
                      order.status === 'Draft'
                        ? 'default'
                        : order.status === 'Ordered'
                          ? 'warning'
                          : 'success'
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" variant="outlined" onClick={() => toggleStatus(order)}>
                      {order.status === 'Draft'
                        ? 'Mark Ordered'
                        : order.status === 'Ordered'
                          ? 'Mark Received'
                          : 'Received'}
                    </Button>
                    <IconButton size="small" onClick={() => openEdit(order)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            label="Supplier"
            fullWidth
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              label="Total Items"
              type="number"
              fullWidth
              value={totalItems}
              onChange={(e) => setTotalItems(e.target.value)}
            />
            <TextField
              margin="normal"
              label="Total Qty"
              type="number"
              fullWidth
              value={totalQty}
              onChange={(e) => setTotalQty(e.target.value)}
            />
          </Stack>
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
