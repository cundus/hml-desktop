import DeleteIcon from '@mui/icons-material/Delete'
import RedeemIcon from '@mui/icons-material/Redeem'
import StarIcon from '@mui/icons-material/Star'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CurrencyInput, { type CurrencyInputRef } from '@renderer/components/CurrencyInput'
import Kbd from '@renderer/components/Kbd'
import type React from 'react'
import { useState } from 'react'
import { formatCurrency } from '../../../utils/currency'
import type { Product } from './ProductBrowser'

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
  onRemove: (id: string) => void
  onChangeDiscount: (value: number) => void
  onCheckout: () => void
  onSaveOpenBill?: () => void
  disabled?: boolean
  discountInputRef?: React.RefObject<CurrencyInputRef | null>
  // Point redemption props
  customerPoints?: number
  pointsToRedeem?: number
  pointRedemptionValue?: number // How much 1 point is worth in Rp
  minPointsToRedeem?: number
  onPointsRedeemChange?: (points: number) => void
}

export default function CartPanel({
  items,
  subtotal,
  discount,
  total,
  onRemove,
  onChangeDiscount,
  onCheckout,
  onSaveOpenBill,
  disabled,
  discountInputRef,
  customerPoints = 0,
  pointsToRedeem = 0,
  pointRedemptionValue = 10,
  minPointsToRedeem = 100,
  onPointsRedeemChange
}: CartPanelProps): React.JSX.Element {
  const [showPointsInput, setShowPointsInput] = useState(false)
  const [pointsInputValue, setPointsInputValue] = useState('')

  // Calculate discount percentage from nominal
  const discountPercentage = subtotal > 0 ? ((discount / subtotal) * 100).toFixed(1) : '0'

  // Calculate point discount
  const pointDiscount = pointsToRedeem * pointRedemptionValue
  const canRedeemPoints = customerPoints >= minPointsToRedeem && onPointsRedeemChange

  const handleApplyPoints = (): void => {
    const points = parseInt(pointsInputValue, 10) || 0
    const maxPoints = Math.min(
      customerPoints,
      Math.floor((subtotal - discount) / pointRedemptionValue)
    )
    const validPoints = Math.min(Math.max(0, points), maxPoints)
    onPointsRedeemChange?.(validPoints)
    setShowPointsInput(false)
    setPointsInputValue('')
  }

  const handleRemovePoints = (): void => {
    onPointsRedeemChange?.(0)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="center">Satuan</TableCell>
              <TableCell align="right">Harga</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="center" width={50}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 250 }}>
                    {item.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    {/* <IconButton
                      size="small"
                      onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton> */}
                    <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    {/* <IconButton
                      size="small"
                      onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton> */}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">{item.uomCode}</Typography>
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
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

        {/* Point Redemption Section */}
        {customerPoints > 0 && onPointsRedeemChange && (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <StarIcon fontSize="small" color="warning" />
                <Typography variant="body2">
                  Poin: <strong>{customerPoints.toLocaleString()}</strong>
                </Typography>
              </Stack>
              {pointsToRedeem > 0 ? (
                <Chip
                  size="small"
                  color="success"
                  label={`-${formatCurrency(pointDiscount)}`}
                  onDelete={handleRemovePoints}
                />
              ) : canRedeemPoints ? (
                <Tooltip title={`Min. ${minPointsToRedeem} poin`}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RedeemIcon />}
                    onClick={() => setShowPointsInput(true)}
                  >
                    Tukar
                  </Button>
                </Tooltip>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Min. {minPointsToRedeem} poin
                </Typography>
              )}
            </Stack>

            {showPointsInput && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  type="number"
                  placeholder={`Max ${customerPoints}`}
                  value={pointsInputValue}
                  onChange={(e) => setPointsInputValue(e.target.value)}
                  sx={{ flex: 1 }}
                  inputProps={{ min: minPointsToRedeem, max: customerPoints }}
                />
                <Button size="small" variant="contained" onClick={handleApplyPoints}>
                  Terapkan
                </Button>
                <Button size="small" onClick={() => setShowPointsInput(false)}>
                  Batal
                </Button>
              </Stack>
            )}

            {pointsToRedeem > 0 && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                {pointsToRedeem.toLocaleString()} poin = {formatCurrency(pointDiscount)} diskon
              </Typography>
            )}
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="subtitle1">Total</Typography>
          <Typography variant="subtitle1" fontWeight="700">
            {formatCurrency(total - pointDiscount)}
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

        {onSaveOpenBill && (
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ mt: 1 }}
            onClick={onSaveOpenBill}
            disabled={disabled || items.length === 0}
          >
            Simpan Open Bill (<Kbd keys={['F7']} />)
          </Button>
        )}
      </Box>
    </Box>
  )
}
