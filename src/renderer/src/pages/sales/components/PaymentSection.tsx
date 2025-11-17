import type React from 'react'
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material'

export type PaymentMethod = 'cash' | 'card' | 'qris'

export type PaymentSectionProps = {
  total: number
  method: PaymentMethod
  paidAmount: number
  onMethodChange: (method: PaymentMethod) => void
  onPaidAmountChange: (amount: number) => void
  paidInputRef?: React.Ref<HTMLInputElement>
}

export default function PaymentSection({
  total,
  method,
  paidAmount,
  onMethodChange,
  onPaidAmountChange,
  paidInputRef
}: PaymentSectionProps): React.JSX.Element {
  const change = method === 'cash' ? Math.max(0, paidAmount - total) : 0

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Payment
      </Typography>
      <RadioGroup
        row
        value={method}
        onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
      >
        <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
        <FormControlLabel value="card" control={<Radio size="small" />} label="Card" />
        <FormControlLabel value="qris" control={<Radio size="small" />} label="QRIS" />
      </RadioGroup>

      {method === 'cash' && (
        <Stack direction="row" spacing={2} mt={1} alignItems="center">
          <TextField
            size="small"
            type="number"
            label="Paid (IDR)"
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(Number(e.target.value) || 0)}
            sx={{ maxWidth: 180 }}
            inputProps={{ min: 0 }}
            inputRef={paidInputRef}
          />
          <Typography variant="body2" color="text.secondary">
            Change:{' '}
            <Typography component="span" fontWeight="600">
              {change.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </Typography>
          </Typography>
        </Stack>
      )}
    </Box>
  )
}
