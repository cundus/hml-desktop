import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Slide, { SlideProps } from '@mui/material/Slide'

type ToastSeverity = 'success' | 'error' | 'warning' | 'info'

interface ToastOptions {
  title?: string
  message: string
  severity?: ToastSeverity
  duration?: number
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<ToastOptions>({
    message: '',
    severity: 'info',
    duration: 4000
  })

  const showToast = useCallback((options: ToastOptions) => {
    setToast({
      title: options.title,
      message: options.message,
      severity: options.severity || 'info',
      duration: options.duration || 4000
    })
    setOpen(true)
  }, [])

  const success = useCallback((message: string, title?: string) => {
    showToast({ message, title, severity: 'success' })
  }, [showToast])

  const error = useCallback((message: string, title?: string) => {
    showToast({ message, title, severity: 'error', duration: 6000 })
  }, [showToast])

  const warning = useCallback((message: string, title?: string) => {
    showToast({ message, title, severity: 'warning' })
  }, [showToast])

  const info = useCallback((message: string, title?: string) => {
    showToast({ message, title, severity: 'info' })
  }, [showToast])

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return
    setOpen(false)
  }

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ minWidth: 300, maxWidth: 450 }}
        >
          {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
