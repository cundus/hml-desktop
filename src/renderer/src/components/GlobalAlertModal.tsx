import { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import { globalAlertStore, type AlertType, type AlertOptions } from '../lib/globalAlert'

const iconMap: Record<AlertType, React.ReactNode> = {
  success: <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />,
  error: <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />,
  warning: <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
  info: <InfoIcon sx={{ fontSize: 48, color: 'info.main' }} />
}

const colorMap: Record<AlertType, string> = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main'
}

export default function GlobalAlertModal(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<AlertOptions | null>(null)
  const [isConfirm, setIsConfirm] = useState(false)

  useEffect(() => {
    const unsubscribe = globalAlertStore.subscribe((state) => {
      setOpen(state.open)
      setOptions(state.options)
      setIsConfirm(!!state.resolve)
    })

    return unsubscribe
  }, [])

  const handleClose = (): void => {
    globalAlertStore.close(false)
  }

  const handleConfirm = (): void => {
    globalAlertStore.close(true)
  }

  if (!options) return <></>

  const type = options.type
  const hasCancel = isConfirm || !!options.cancelText

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      {options.title && (
        <DialogTitle
          sx={{
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: colorMap[type]
          }}
        >
          {options.title}
        </DialogTitle>
      )}
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 2
          }}
        >
          {iconMap[type]}
          <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {options.message}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
        {hasCancel && (
          <Button variant="outlined" onClick={handleClose} sx={{ minWidth: 100 }}>
            {options.cancelText ?? 'Batal'}
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleConfirm}
          color={type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'primary'}
          sx={{ minWidth: 100 }}
          autoFocus
        >
          {options.confirmText ?? 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
