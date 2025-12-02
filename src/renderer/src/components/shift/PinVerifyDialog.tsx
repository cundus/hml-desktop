import { useState, useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import LockIcon from '@mui/icons-material/Lock'

interface PinVerifyDialogProps {
  open: boolean
  userName?: string
  onVerify: (pin: string) => Promise<boolean>
  onClose: () => void
}

export default function PinVerifyDialog({
  open,
  userName,
  onVerify,
  onClose
}: PinVerifyDialogProps): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(null)
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const handleSubmit = async (): Promise<void> => {
    if (!pin || pin.length < 4) {
      setError('PIN minimal 4 digit')
      return
    }

    try {
      setVerifying(true)
      setError(null)
      const success = await onVerify(pin)
      if (!success) {
        setError('PIN salah')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Gagal memverifikasi PIN')
    } finally {
      setVerifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
      onClose={(_, reason) => {
        if (reason !== 'backdropClick') {
          onClose()
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <LockIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h6">Verifikasi PIN</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Masukkan PIN untuk melanjutkan sebagai
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {userName || 'Kasir'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          inputRef={inputRef}
          fullWidth
          type="password"
          label="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={handleKeyDown}
          disabled={verifying}
          inputProps={{
            maxLength: 6,
            inputMode: 'numeric',
            pattern: '[0-9]*',
            style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
          }}
          placeholder="••••••"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={verifying}>
          Batal
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={verifying || pin.length < 4}>
          {verifying ? 'Memverifikasi...' : 'Verifikasi'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
