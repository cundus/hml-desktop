import { useState, useEffect } from 'react'
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
import { formatCurrency } from '@renderer/utils/currency'

interface CashierShift {
  id: string
  userId: string
  storeId: string
  status: 'OPEN' | 'CLOSED'
  initialCash: string
  openedAt: Date
  userName?: string
}

interface ForceCloseShiftDialogProps {
  open: boolean
  shift: CashierShift | null
  onClose: () => void
  onConfirm: (shiftId: string, notes: string) => Promise<void>
}

export default function ForceCloseShiftDialog({
  open,
  shift,
  onClose,
  onConfirm
}: ForceCloseShiftDialogProps): React.JSX.Element {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setNotes('')
      setError(null)
      setConfirmStep(false)
    }
  }, [open])

  const handleClose = (): void => {
    if (!submitting) {
      onClose()
    }
  }

  const handleNext = (): void => {
    if (notes.trim().length < 5) {
      setError('Mohon masukkan alasan tutup paksa (minimal 5 karakter)')
      return
    }

    setError(null)
    setConfirmStep(true)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!shift) return

    try {
      setSubmitting(true)
      setError(null)
      await onConfirm(shift.id, notes.trim())
      // onClose is handled by parent, but we can wait until complete
    } catch (err) {
      setError((err as Error).message || 'Gagal menutup paksa shift')
      setConfirmStep(false)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date: Date | string): string => {
    const dateValue = new Date(date)
    if (isNaN(dateValue.getTime())) return '-'
    return dateValue.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!shift) return <></>

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'error.main' }}>Tutup Paksa Shift Kasir</DialogTitle>
      <DialogContent>
        {!confirmStep ? (
          <Box sx={{ pt: 1 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              Tindakan ini akan <strong>menutup shift secara paksa</strong> untuk kasir <b>{shift.userName || shift.userId}</b>.
              Kas akhir akan dihitung otomatis sesuai dengan transaksi di sistem.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Waktu Buka:</Typography>
                <Typography>{formatDate(shift.openedAt)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Kas Awal:</Typography>
                <Typography>Rp {formatCurrency(parseFloat(shift.initialCash))}</Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Alasan Tutup Paksa (Wajib):
            </Typography>
            <TextField
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Misal: Kasir lupa tutup shift"
              required
              autoFocus
              error={!!error && !confirmStep}
            />

            {error && !confirmStep && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Apakah Anda benar-benar yakin ingin menutup paksa shift ini?
            </Alert>

            <Box sx={{ p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Informasi Shift:
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {shift.userName || shift.userId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kas Awal: {formatCurrency(parseFloat(shift.initialCash))}
              </Typography>
              
              <Divider sx={{ my: 1.5 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Alasan:
              </Typography>
              <Typography variant="body2">{notes}</Typography>
            </Box>

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!confirmStep ? (
          <>
            <Button onClick={handleClose} disabled={submitting}>
              Batal
            </Button>
            <Button 
              onClick={handleNext} 
              variant="contained" 
              color="error"
              disabled={notes.trim().length < 5}
            >
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
              color="error"
              disabled={submitting}
            >
              {submitting ? 'Memproses...' : 'Ya, Tutup Paksa'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
