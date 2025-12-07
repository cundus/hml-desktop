import type React from 'react'
import { useEffect, useRef, useState } from 'react'
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
import CurrencyInput, { type CurrencyInputRef } from '../../../components/CurrencyInput'
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
  const [cashPaid, setCashPaid] = useState<number>(0)
  const paymentInputRef = useRef<CurrencyInputRef | null>(null)

  const handleConfirm = (): void => {
    if (paymentMethod === 'credit' && !paymentDeadline) {
      return // Credit requires deadline
    }
    onConfirm(paymentMethod, paymentMethod === 'credit' ? paymentDeadline || undefined : undefined)
  }

  const isConfirmDisabled = paymentMethod === 'credit' && !paymentDeadline

  // Auto-focus cash input when dialog opens or when switching to cash
  useEffect(() => {
    if (!open || paymentMethod !== 'cash') return

    const timer = setTimeout(() => {
      paymentInputRef.current?.focus()
      paymentInputRef.current?.select()
    }, 100)

    return () => clearTimeout(timer)
  }, [open, paymentMethod])

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (!open) return

    switch (event.key) {
      case 'F1':
        event.preventDefault()
        setPaymentMethod('cash')
        break
      case 'F2':
        event.preventDefault()
        setPaymentMethod('card')
        setCashPaid(0)
        break
      case 'F3':
        event.preventDefault()
        setPaymentMethod('qris')
        setCashPaid(0)
        break
      case 'F4':
        event.preventDefault()
        setPaymentMethod('credit')
        setCashPaid(0)
        break
      default:
        break
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle>Pilih Metode Pembayaran</DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack spacing={3}>
            {/* Total & cash info */}
            <Box sx={{ p: 2, borderRadius: 1 }}>
              <Typography variant="h6" align="center">
                Total: {formatCurrency(total)}
              </Typography>
              {paymentMethod === 'cash' && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <CurrencyInput
                    ref={paymentInputRef}
                    size="small"
                    label="Dibayar (tunai)"
                    value={cashPaid}
                    onChange={(value) => setCashPaid(value)}
                    inputProps={{ min: 0 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Kembalian:{' '}
                    <Typography component="span" fontWeight="600">
                      {formatCurrency(Math.max(0, cashPaid - total))}
                    </Typography>
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Payment Method Selection */}
            <RadioGroup
              value={paymentMethod}
              onChange={(e) => {
                const next = e.target.value as PaymentMethod
                setPaymentMethod(next)
                if (next !== 'cash') {
                  setCashPaid(0)
                }
              }}
            >
              <FormControlLabel
                value="cash"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="500">
                      💵 Tunai (Cash) [F1]
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
                      💳 Kartu Debit/Kredit [F2]
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
                      📱 QRIS [F3]
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
                      📋 Kredit (Hutang) [F4]
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
