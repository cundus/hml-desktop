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
import { TextField } from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'
import useBranchConfig from '@renderer/hooks/useBranchConfig'
import SettingsIcon from '@mui/icons-material/Settings'
// ... imports

function Settings(): React.JSX.Element {
  const navigate = useNavigate()
  const { config, refresh } = useBranchConfig()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [resetDataDialogOpen, setResetDataDialogOpen] = useState(false)
  const [resetConfirmationText, setResetConfirmationText] = useState('')

  const confirmResetData = async (): Promise<void> => {
    try {
      await window.api.db.appConfig.resetData()
      setResetDataDialogOpen(false)
      setResetConfirmationText('')
      // Show success message (using alert for simplicity, or snackbar if available)
      alert('Data transaksi berhasil dihapus.')
      // Refresh to ensure UI updates if needed
      if (refresh) await refresh()
    } catch (err) {
      console.error('Failed to reset data:', err)
      alert('Gagal menghapus data: ' + (err as Error).message)
    }
  }

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
                <Typography variant="body1">{config.managerName || '-'}</Typography>
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

      <Card sx={{ mb: 3, border: '1px solid #ffcdd2' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <WarningIcon color="error" />
            <Typography variant="h6" color="error">
              Zona Bahaya
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Reset Data Transaksi
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tindakan ini akan menghapus <strong>SEMUA</strong> data transaksi (Penjualan, Stok,
              Purchase Order, Opname, Pengeluaran).
              <br />
              Data Master (Produk, Kategori, Pelanggan, Supplier) dan Akun User{' '}
              <strong>TIDAK</strong> akan dihapus.
            </Typography>
            <Button variant="contained" color="error" onClick={() => setResetDataDialogOpen(true)}>
              Hapus Data Transaksi
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirm Reset Data Dialog */}
      <Dialog open={resetDataDialogOpen} onClose={() => setResetDataDialogOpen(false)}>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Konfirmasi Penghapusan Data
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>PERINGATAN: Tindakan ini tidak dapat dibatalkan!</strong>
          </Alert>
          <Typography paragraph>Anda akan menghapus semua data berikut:</Typography>
          <ul>
            <li>Semua riwayat penjualan dan item transaksi</li>
            <li>Semua riwayat stok (masuk, keluar, adjustment)</li>
            <li>Semua Purchase Order (Draft, Ordered, Received)</li>
            <li>Semua data stok produk (Stok akan menjadi 0)</li>
            <li>Riwayat shift kasir dan pengeluaran</li>
          </ul>
          <Typography paragraph sx={{ fontWeight: 'bold' }}>
            Data User, Role, dan Data Master (Produk/Supplier/Customer) akan TETAP ADA.
          </Typography>
          <Typography>
            Ketik <strong>HAPUS</strong> untuk mengonfirmasi.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            variant="outlined"
            placeholder="Ketik HAPUS"
            value={resetConfirmationText}
            onChange={(e) => setResetConfirmationText(e.target.value)}
            color="error"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDataDialogOpen(false)}>Batal</Button>
          <Button
            onClick={confirmResetData}
            color="error"
            variant="contained"
            disabled={resetConfirmationText !== 'HAPUS'}
          >
            Ya, Hapus Semua Data Transaksi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Reconfigure Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Konfirmasi Konfigurasi Ulang</DialogTitle>
        <DialogContent>
          <Typography>
            Anda akan mengkonfigurasi ulang perangkat ini. Semua pengaturan cabang dan koneksi cloud
            akan dihapus. Anda akan diarahkan ke halaman setup.
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
