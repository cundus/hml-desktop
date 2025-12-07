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
import { formatCurrency } from '../../../utils/currency'

export type PaymentMethod = 'cash' | 'card' | 'qris'

export type PaymentSectionProps = {
  total: number
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
}

export default function PaymentSection({ total, method, onMethodChange }: PaymentSectionProps): React.JSX.Element {
  const change = 0 // Change is now handled in the payment dialog

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Pembayaran
      </Typography>
      <RadioGroup
        row
        value={method}
        onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
      >
        <FormControlLabel value="cash" control={<Radio size="small" />} label="Tunai" />
        <FormControlLabel value="card" control={<Radio size="small" />} label="Kartu" />
        <FormControlLabel value="qris" control={<Radio size="small" />} label="QRIS" />
      </RadioGroup>

      {method === 'cash' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Nominal pembayaran tunai akan diinput di dialog konfirmasi (F9 / Ctrl+Enter).
        </Typography>
      )}
    </Box>
  )
}
