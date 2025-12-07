import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CurrencyInput from '../CurrencyInput'

interface CloseShiftDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (closingCash: string, notes?: string) => Promise<void>
  initialCash: string
}

export default function CloseShiftDialog({
  open,
  onClose,
  onConfirm,
  initialCash
}: CloseShiftDialogProps): React.JSX.Element {
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const handleClose = (): void => {
    if (!submitting) {
      setClosingCash('')
      setNotes('')
      setError(null)
      setConfirmStep(false)
      onClose()
    }
  }

  const handleNext = (): void => {
    if (!closingCash) {
      setError('Mohon masukkan jumlah kas akhir')
      return
    }

    const cashValue = parseFloat(closingCash)
    if (isNaN(cashValue) || cashValue < 0) {
      setError('Nilai kas akhir tidak valid')
      return
    }

    setError(null)
    setConfirmStep(true)
  }

  const handleSubmit = async (): Promise<void> => {
    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(closingCash, notes || undefined)
      handleClose()
    } catch (err) {
      setError((err as Error).message || 'Gagal menutup shift')
      setConfirmStep(false)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value) || 0
    return num.toLocaleString('id-ID')
  }

  const initialCashNum = parseFloat(initialCash) || 0
  const closingCashNum = parseFloat(closingCash) || 0
  const difference = closingCashNum - initialCashNum

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tutup Shift Kasir</DialogTitle>
      <DialogContent>
        {!confirmStep ? (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Masukkan jumlah kas akhir untuk menutup shift Anda.
            </Typography>

            <Box sx={{ mb: 2, p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Kas Awal
              </Typography>
              <Typography variant="h6">Rp {formatCurrency(initialCash)}</Typography>
            </Box>

            <CurrencyInput
              label="Kas Akhir"
              value={Number(closingCash) || 0}
              onChange={(value) => setClosingCash(value.toString())}
              fullWidth
              margin="normal"
              required
              autoFocus
              helperText={closingCash ? `Rp ${formatCurrency(closingCash)}` : ''}
            />

            <TextField
              label="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={2}
              placeholder="Tambahkan catatan jika diperlukan..."
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Apakah Anda yakin ingin menutup shift?
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Kas Awal:</Typography>
                <Typography>Rp {formatCurrency(initialCash)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Kas Akhir:</Typography>
                <Typography>Rp {formatCurrency(closingCash)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight="bold">Selisih:</Typography>
                <Typography
                  fontWeight="bold"
                  color={difference >= 0 ? 'success.main' : 'error.main'}
                >
                  {difference >= 0 ? '+' : ''}Rp {formatCurrency(difference.toString())}
                </Typography>
              </Box>
            </Box>

            {notes && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Catatan:
                </Typography>
                <Typography variant="body2">{notes}</Typography>
              </Box>
            )}

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!confirmStep ? (
          <>
            <Button onClick={handleClose} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleNext} variant="contained" disabled={!closingCash}>
              Lanjutkan
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setConfirmStep(false)} disabled={submitting}>
              Kembali
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="warning"
              disabled={submitting}
            >
              {submitting ? 'Memproses...' : 'Ya, Tutup Shift'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
