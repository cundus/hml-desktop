import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { formatCurrency } from '../../../utils/currency'

export type PaymentMethod = 'cash' | 'card' | 'qris' | 'credit'

export interface PaymentMethodDialogProps {
  open: boolean
  total: number
  onClose: () => void
  onConfirm: (paymentMethod: PaymentMethod, paymentDeadline?: Date) => void
}

export default function PaymentMethodDialog({
  open,
  total,
  onClose,
  onConfirm
}: PaymentMethodDialogProps): React.JSX.Element {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentDeadline, setPaymentDeadline] = useState<Date | null>(null)

  const handleConfirm = (): void => {
    if (paymentMethod === 'credit' && !paymentDeadline) {
      return // Credit requires deadline
    }
    onConfirm(paymentMethod, paymentMethod === 'credit' ? paymentDeadline || undefined : undefined)
  }

  const isConfirmDisabled = paymentMethod === 'credit' && !paymentDeadline

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pilih Metode Pembayaran</DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack spacing={3}>
            {/* Total Amount Display */}
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="h6" align="center">
                Total: {formatCurrency(total)}
              </Typography>
            </Box>

            {/* Payment Method Selection */}
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <FormControlLabel
                value="cash"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      💵 Tunai (Cash)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pembayaran langsung dengan uang tunai
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                value="card"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      💳 Kartu Debit/Kredit
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pembayaran dengan kartu debit atau kredit
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                value="qris"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      📱 QRIS
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pembayaran dengan QR Code (GoPay, OVO, Dana, dll)
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                value="credit"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      📋 Kredit (Hutang)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pembayaran dicicil atau hutang
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {/* Credit Payment Deadline */}
            {paymentMethod === 'credit' && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Batas Waktu Pembayaran *
                  </Typography>
                  <DatePicker
                    label="Tanggal Jatuh Tempo"
                    value={paymentDeadline}
                    onChange={(newValue) => setPaymentDeadline(newValue)}
                    minDate={new Date()}
                    sx={{ width: '100%' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Pelanggan harus melunasi pembayaran sebelum tanggal ini
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Batal
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={isConfirmDisabled}>
          Konfirmasi
        </Button>
      </DialogActions>
    </Dialog>
  )
}
