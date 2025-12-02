import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import useAuth from '../../hooks/useAuth'

interface Store {
  id: string
  name: string
  code: string
}

interface OpenShiftDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (initialCash: string, storeId: string) => Promise<void>
}

export default function OpenShiftDialog({
  open,
  onClose,
  onSubmit
}: OpenShiftDialogProps): React.JSX.Element {
  const { storeId: userStoreId } = useAuth()

  const [initialCash, setInitialCash] = useState('')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadStores()
      setInitialCash('')
      setError(null)
    }
  }, [open])

  const loadStores = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await window.api.db.stores.getAll()
      if (response.success && response.data) {
        setStores(response.data)
        // Use user's assigned store if available, otherwise first store
        if (userStoreId) {
          setStoreId(userStoreId)
        } else if (response.data.length === 1) {
          setStoreId(response.data[0].id)
        }
      }
    } catch {
      setError('Gagal memuat data toko')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!initialCash || !storeId) {
      setError('Mohon lengkapi semua field')
      return
    }

    const cashValue = parseFloat(initialCash)
    if (isNaN(cashValue) || cashValue < 0) {
      setError('Nilai kas awal tidak valid')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await onSubmit(initialCash, storeId)
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Gagal membuka shift')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value) || 0
    return num.toLocaleString('id-ID')
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>Buka Shift Kasir</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Masukkan jumlah kas awal untuk memulai shift Anda.
            </Typography>

            <TextField
              select
              label="Toko / Cabang"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled={stores.length === 1}
            >
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name} ({store.code})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Kas Awal"
              type="number"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value)}
              fullWidth
              margin="normal"
              required
              autoFocus
              InputProps={{
                startAdornment: <InputAdornment position="start">Rp</InputAdornment>
              }}
              inputProps={{ min: 0, step: 1000 }}
              helperText={
                initialCash ? `Rp ${formatCurrency(initialCash)}` : 'Masukkan jumlah kas awal'
              }
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || submitting || !initialCash || !storeId}
        >
          {submitting ? 'Memproses...' : 'Buka Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
