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
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { formatCurrency } from '../../../utils/currency'
import type { Product } from './ProductBrowser'
import Kbd from '@renderer/components/Kbd'
import CurrencyInput, { type CurrencyInputRef } from '@renderer/components/CurrencyInput'

export type CartItem = Product & {
  quantity: number
  total: number
  productId?: string
  uomId?: string | null
  uomCode?: string
  priceCategoryId?: string
  priceCategoryName?: string
  conversionFactor?: number
  baseQuantity?: number
}

export type CartPanelProps = {
  items: CartItem[]
  subtotal: number
  discount: number // Now represents nominal amount (Rupiah), not percentage
  total: number
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onChangeDiscount: (value: number) => void
  onCheckout: () => void
  disabled?: boolean
  discountInputRef?: React.RefObject<CurrencyInputRef | null>
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
  // Calculate discount percentage from nominal
  const discountPercentage = subtotal > 0 ? ((discount / subtotal) * 100).toFixed(1) : '0'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Harga</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center" width={50}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                    {item.name}
                  </Typography>
                  {item.uomCode && (
                    <Typography variant="caption" color="text.secondary">
                      {item.uomCode}
                      {item.priceCategoryName && ` • ${item.priceCategoryName}`}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(item.price)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="500">
                    {formatCurrency(item.total)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onRemove(item.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    Keranjang kosong
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Subtotal
          </Typography>
          <Typography variant="body2" fontWeight="500">
            {formatCurrency(subtotal)}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            Diskon <Kbd keys={['F4']} size="small" />
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              ({discountPercentage}%)
            </Typography>
          </Typography>
          <CurrencyInput
            ref={discountInputRef}
            size="small"
            value={discount}
            onChange={(value) => onChangeDiscount(Math.min(value, subtotal))}
            sx={{ width: 140 }}
          />
        </Stack>

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
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
