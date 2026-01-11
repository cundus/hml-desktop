import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CurrencyInput, { type CurrencyInputRef } from '../../../components/CurrencyInput'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { formatCurrency } from '../../../utils/currency'

export type PaymentCategory = 'tunai' | 'non-tunai' | 'kredit'

export interface PaymentMethodDialogProps {
  open: boolean
  total: number
  onClose: () => void
  onConfirm: (
    paymentMethod: string, // 'cash' | selected method name | 'credit'
    paymentDeadline?: Date,
    cashDetails?: { paidAmount: string; change: string },
    downPayment?: number
  ) => void
}

interface NonCashMethod {
  id: string
  name: string
}

export default function PaymentMethodDialog({
  open,
  total,
  onClose,
  onConfirm
}: PaymentMethodDialogProps): React.JSX.Element {
  const [category, setCategory] = useState<PaymentCategory>('tunai')
  const [cashPaid, setCashPaid] = useState<number>(0)
  const [selectedNonCashMethod, setSelectedNonCashMethod] = useState<string>('')
  const [nonCashMethods, setNonCashMethods] = useState<NonCashMethod[]>([])
  const [paymentDeadline, setPaymentDeadline] = useState<Date | null>(null)
  const [downPayment, setDownPayment] = useState<number>(0)
  const paymentInputRef = useRef<CurrencyInputRef | null>(null)

  // Load non-cash payment methods
  useEffect(() => {
    if (open) {
      loadPaymentMethods()
    }
  }, [open])

  const loadPaymentMethods = async (): Promise<void> => {
    try {
      const response = await window.api.db.paymentMethods.getActive()
      if (response.success && response.data) {
        setNonCashMethods(response.data)
        if (response.data.length > 0 && !selectedNonCashMethod) {
          setSelectedNonCashMethod(response.data[0].name)
        }
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error)
    }
  }

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCategory('tunai')
      setCashPaid(0)
      setPaymentDeadline(null)
      setDownPayment(0)
    }
  }, [open])

  // Auto-focus cash input when dialog opens or when switching to tunai
  useEffect(() => {
    if (!open || category !== 'tunai') return

    const timer = setTimeout(() => {
      paymentInputRef.current?.focus()
      paymentInputRef.current?.select()
    }, 200) // Slightly longer delay for more reliable focusing

    return () => clearTimeout(timer)
  }, [open, category])

  const handleConfirm = (): void => {
    if (category === 'tunai') {
      if (cashPaid < total) return
      onConfirm('cash', undefined, {
        paidAmount: cashPaid.toString(),
        change: Math.max(0, cashPaid - total).toString()
      })
    } else if (category === 'non-tunai') {
      if (!selectedNonCashMethod) return
      onConfirm(selectedNonCashMethod)
    } else if (category === 'kredit') {
      if (!paymentDeadline) return
      onConfirm('credit', paymentDeadline, undefined, downPayment > 0 ? downPayment : undefined)
    }
  }

  const isConfirmDisabled =
    (category === 'tunai' && cashPaid < total) ||
    (category === 'non-tunai' && !selectedNonCashMethod) ||
    (category === 'kredit' && !paymentDeadline)

  const change = Math.max(0, cashPaid - total)

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (!open) return

    switch (event.key) {
      case 'F1':
        event.preventDefault()
        setCategory('tunai')
        break
      case 'F2':
        event.preventDefault()
        setCategory('non-tunai')
        break
      case 'F3':
        event.preventDefault()
        setCategory('kredit')
        break
      default:
        break
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth onKeyDown={handleKeyDown}>
      <DialogTitle sx={{ pb: 1 }}>Metode Pembayaran</DialogTitle>

      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack spacing={3}>
            {/* Total Display */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                textAlign: 'center'
              }}
            >
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Pembayaran
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(total)}
              </Typography>
            </Box>

            {/* Category Toggle */}
            <ToggleButtonGroup
              value={category}
              exclusive
              onChange={(_, value) => value && setCategory(value)}
              fullWidth
              size="large"
            >
              <ToggleButton value="tunai" sx={{ py: 1.5 }}>
                💵 TUNAI [F1]
              </ToggleButton>
              <ToggleButton value="non-tunai" sx={{ py: 1.5 }}>
                💳 NON TUNAI [F2]
              </ToggleButton>
              <ToggleButton value="kredit" sx={{ py: 1.5 }}>
                📋 KREDIT [F3]
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider />

            {/* TUNAI Section */}
            {category === 'tunai' && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'primary.50'
                }}
              >
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  💵 Pembayaran Tunai
                </Typography>

                <CurrencyInput
                  ref={paymentInputRef}
                  label="Jumlah Dibayar"
                  value={cashPaid}
                  onChange={(value) => setCashPaid(value)}
                  inputProps={{ min: 0 }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      textAlign: 'right'
                    }
                  }}
                />

                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 1,
                    bgcolor: change > 0 ? 'success.light' : '',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Kembalian
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={change > 0 ? 'success.dark' : 'text.secondary'}
                  >
                    {formatCurrency(change)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* NON-TUNAI Section */}
            {category === 'non-tunai' && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  💳 Pilih Metode Pembayaran
                </Typography>

                {nonCashMethods.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center', borderRadius: 1 }}>
                    <Typography color="text.secondary">
                      Belum ada metode pembayaran non-tunai.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tambahkan di menu Pengaturan → Data Master → Metode Pembayaran
                    </Typography>
                  </Box>
                ) : (
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Metode Pembayaran</InputLabel>
                    <Select
                      value={selectedNonCashMethod}
                      label="Metode Pembayaran"
                      onChange={(e) => setSelectedNonCashMethod(e.target.value)}
                    >
                      {nonCashMethods.map((method) => (
                        <MenuItem key={method.id} value={method.name}>
                          {method.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}

            {/* KREDIT Section */}
            {category === 'kredit' && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  📋 Pembayaran Kredit (Hutang)
                </Typography>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <DatePicker
                    label="Tanggal Jatuh Tempo *"
                    value={paymentDeadline}
                    onChange={(newValue) => setPaymentDeadline(newValue)}
                    minDate={new Date()}
                    sx={{ width: '100%' }}
                  />

                  <CurrencyInput
                    label="Uang Muka (DP) - Opsional"
                    value={downPayment}
                    onChange={(value) => setDownPayment(value)}
                    inputProps={{ min: 0 }}
                  />

                  {downPayment > 0 && (
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="body2">
                        Sisa Hutang:{' '}
                        <Typography component="span" fontWeight="bold">
                          {formatCurrency(Math.max(0, total - downPayment))}
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Pelanggan harus melunasi pembayaran sebelum tanggal jatuh tempo
                </Typography>
              </Box>
            )}
          </Stack>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" size="large">
          Batal
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isConfirmDisabled}
          size="large"
          sx={{ minWidth: 150 }}
        >
          Konfirmasi
        </Button>
      </DialogActions>
    </Dialog>
  )
}
