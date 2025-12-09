import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import StorefrontIcon from '@mui/icons-material/Storefront'
import DevicesIcon from '@mui/icons-material/Devices'
import CloudIcon from '@mui/icons-material/Cloud'
import SettingsIcon from '@mui/icons-material/Settings'
import useBranchConfig from '../hooks/useBranchConfig'

function Settings(): React.JSX.Element {
  const navigate = useNavigate()
  const { config, refresh } = useBranchConfig()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const handleReconfigure = (): void => {
    setConfirmDialogOpen(true)
  }

  const confirmReconfigure = async (): Promise<void> => {
    try {
      // Reset config and navigate to setup
      await window.api.db.appConfig.reset()
      await refresh()
      navigate('/setup')
    } catch (err) {
      console.error('Failed to clear config:', err)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pengaturan
      </Typography>

      {/* Device Configuration Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <DevicesIcon color="primary" />
            <Typography variant="h6">Konfigurasi Perangkat</Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {config ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  ID Perangkat
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {config.deviceId || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Cabang Aktif
                </Typography>
                <Chip
                  icon={<StorefrontIcon />}
                  label={`${config.branchName || 'Tidak dikonfigurasi'}${config.isHeadBranch ? ' (HQ)' : ''}`}
                  color={config.branchId ? 'primary' : 'default'}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Cloud Database
                </Typography>
                <Chip
                  icon={<CloudIcon />}
                  label={config.cloudDbUrl ? 'Terhubung' : 'Tidak terhubung'}
                  color={config.cloudDbUrl ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Manager
                </Typography>
                <Typography variant="body1">
                  {config.managerName || '-'}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Alert severity="warning">Konfigurasi perangkat belum tersedia</Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <Button
            variant="outlined"
            color="warning"
            startIcon={<SettingsIcon />}
            onClick={handleReconfigure}
          >
            Konfigurasi Ulang Perangkat
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Reconfigure Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Konfirmasi Konfigurasi Ulang</DialogTitle>
        <DialogContent>
          <Typography>
            Anda akan mengkonfigurasi ulang perangkat ini. Semua pengaturan cabang dan koneksi
            cloud akan dihapus. Anda akan diarahkan ke halaman setup.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Pastikan Anda telah menyinkronkan semua data sebelum melanjutkan.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Batal</Button>
          <Button onClick={confirmReconfigure} color="warning" variant="contained">
            Ya, Konfigurasi Ulang
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Settings
