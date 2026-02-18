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
import SecurityIcon from '@mui/icons-material/Security'

interface StockAuthorizationDialogProps {
  open: boolean
  message?: string
  requiredPermission?: string
  onAuthorized: (userName: string) => void
  onClose: () => void
}

export default function StockAuthorizationDialog({
  open,
  message = 'Otorisasi diperlukan untuk melanjutkan transaksi dengan stok nol.',
  requiredPermission = 'sales.pos.ignore-stock',
  onAuthorized,
  onClose
}: StockAuthorizationDialogProps): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(null)
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
      const res = await window.api.db.auth.authorize(pin, requiredPermission)
      
      if (res.success && res.data?.success) {
        onAuthorized(res.data.userName || 'Supervisor')
        onClose()
      } else {
        setError('PIN salah atau tidak memiliki akses (Supervisor/Admin)')
        setPin('')
        inputRef.current?.focus()
      }
    } catch (err) {
      setError('Gagal memverifikasi otorisasi')
    } finally {
      setVerifying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'warning.main' }} />
          <Typography variant="h6">Otorisasi Supervisor</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {message}
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
          label="PIN Supervisor"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={verifying}
          autoComplete="off"
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
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="warning"
          disabled={verifying || pin.length < 4}
        >
          {verifying ? 'Memverifikasi...' : 'Otorisasi'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
