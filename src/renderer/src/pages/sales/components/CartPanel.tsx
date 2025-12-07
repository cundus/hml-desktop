import type React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { formatCurrency } from '../../../utils/currency'
import type { Product } from './ProductBrowser'
import Kbd from '@renderer/components/Kbd'

export type CartItem = Product & {
  quantity: number
  total: number
}

export type CartPanelProps = {
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onChangeDiscount: (value: number) => void
  onCheckout: () => void
  disabled?: boolean
  discountInputRef?: React.Ref<HTMLInputElement>
}

export default function CartPanel({
  items,
  subtotal,
  discount,
  total,
  onQuantityChange,
  onRemove,
  onChangeDiscount,
  onCheckout,
  disabled,
  discountInputRef
}: CartPanelProps): React.JSX.Element {
  const handleQtyDelta = (id: string, delta: number): void => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    const next = Math.max(1, item.quantity + delta)
    onQuantityChange(id, next)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      <Typography variant="h6">Keranjang Belanja</Typography>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="center">Satuan</TableCell>
              <TableCell align="right">Harga</TableCell>
              <TableCell align="center">Jml</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Keranjang kosong.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{item.unit}</Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => handleQtyDelta(item.id, -1)}
                        disabled={disabled}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" width={24} textAlign="center">
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleQtyDelta(item.id, 1)}
                        disabled={disabled}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.price * item.quantity)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemove(item.id)}
                      disabled={disabled}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Divider />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Subtotal
          </Typography>
          <Typography variant="body2" fontWeight="500">
            {formatCurrency(subtotal)}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Diskon (%)
          </Typography>
          <TextField
            size="small"
            type="number"
            value={discount}
            onChange={(e) => onChangeDiscount(Number(e.target.value) || 0)}
            sx={{ width: 140 }}
            inputProps={{ min: 0, max: 100 }}
            inputRef={discountInputRef}
          />
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1">Total</Typography>
          <Typography variant="subtitle1" fontWeight="700">
            {formatCurrency(total)}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 1 }}
          onClick={onCheckout}
          disabled={disabled || items.length === 0}
        >
          Selesaikan Transaksi (<Kbd keys={['Ctrl', '+', 'Enter']} />)
        </Button>
      </Box>
    </Box>
  )
}
