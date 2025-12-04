import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import EditIcon from '@mui/icons-material/Edit'
import StorefrontIcon from '@mui/icons-material/Storefront'
import PersonIcon from '@mui/icons-material/Person'
import CloudIcon from '@mui/icons-material/Cloud'
import DevicesIcon from '@mui/icons-material/Devices'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningIcon from '@mui/icons-material/Warning'
import { globalAlert } from '../../lib/globalAlert'
import type { DeviceConfig } from '../../../../preload/api/app-config'

interface Store {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export default function AppConfigPage(): React.JSX.Element {
  const [config, setConfig] = useState<DeviceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Edit dialogs
  const [editManagerOpen, setEditManagerOpen] = useState(false)
  const [editCloudUrlOpen, setEditCloudUrlOpen] = useState(false)
  const [resetConfigOpen, setResetConfigOpen] = useState(false)

  // Edit form state
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [cloudDbUrl, setCloudDbUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const res = await window.api.db.appConfig.get()
      if (res.success && res.data) {
        setConfig(res.data)
        setSelectedManagerId(res.data.managerId ?? '')
        setCloudDbUrl(res.data.cloudDbUrl ?? '')
      }
    } catch (err) {
      console.error('Failed to load config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStoresAndUsers = useCallback(async (): Promise<void> => {
    try {
      const [storesRes, usersRes] = await Promise.all([
        window.api.db.stores.getAll(),
        window.api.db.users.getAll()
      ])
      if (storesRes.success && storesRes.data) {
        setStores(storesRes.data)
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data)
      }
    } catch (err) {
      console.error('Failed to load stores/users:', err)
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadStoresAndUsers()
  }, [loadConfig, loadStoresAndUsers])

  const handleSaveManager = async (): Promise<void> => {
    if (!selectedManagerId) {
      globalAlert.warning('Pilih manager terlebih dahulu')
      return
    }

    try {
      setSaving(true)
      const selectedUser = users.find((u) => u.id === selectedManagerId)

      // Re-setup with new manager
      const res = await window.api.db.appConfig.setup({
        branchId: config?.branchId ?? '',
        branchName: config?.branchName ?? '',
        headBranchId: config?.headBranchId ?? undefined,
        headBranchName: config?.headBranchName ?? undefined,
        isHeadBranch: config?.isHeadBranch ?? false,
        cloudDbUrl: config?.cloudDbUrl ?? undefined,
        managerId: selectedManagerId,
        managerName: selectedUser?.name
      })

      if (res.success) {
        globalAlert.success('Manager berhasil diubah')
        setConfig(res.data ?? null)
        setEditManagerOpen(false)
      } else {
        globalAlert.error(res.error ?? 'Gagal menyimpan')
      }
    } catch (err) {
      globalAlert.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCloudUrl = async (): Promise<void> => {
    try {
      setSaving(true)

      const res = await window.api.db.appConfig.setCloudDbUrl(cloudDbUrl)
      if (res.success) {
        globalAlert.success('Cloud DB URL berhasil diubah')
        await loadConfig()
        setEditCloudUrlOpen(false)
      } else {
        globalAlert.error(res.error ?? 'Gagal menyimpan')
      }
    } catch (err) {
      globalAlert.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetConfig = async (): Promise<void> => {
    try {
      setSaving(true)
      const res = await window.api.db.appConfig.reset()
      if (res.success) {
        globalAlert.success('Konfigurasi berhasil direset. Aplikasi akan dimuat ulang...')
        setResetConfigOpen(false)
        // Redirect to setup after short delay
        setTimeout(() => {
          window.location.hash = '#/setup'
          window.location.reload()
        }, 1500)
      } else {
        globalAlert.error(res.error ?? 'Gagal reset konfigurasi')
      }
    } catch (err) {
      globalAlert.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!config) {
    return <Alert severity="error">Gagal memuat konfigurasi aplikasi</Alert>
  }

  const currentStore = stores.find((s) => s.id === config.branchId)
  const headStore = stores.find((s) => s.id === config.headBranchId)
  const currentManager = users.find((u) => u.id === config.managerId)

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Pengaturan Aplikasi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Konfigurasi perangkat, cabang, dan koneksi cloud database
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Device Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              avatar={<DevicesIcon color="primary" />}
              title="Informasi Perangkat"
              subheader="ID unik perangkat ini"
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Device ID
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}
              >
                {config.deviceId}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Branch Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              avatar={<StorefrontIcon color="primary" />}
              title="Informasi Cabang"
              subheader="Cabang yang terdaftar di perangkat ini"
            />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Cabang:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {currentStore?.name ?? config.branchName ?? '-'}
                </Typography>
                {config.isHeadBranch && <Chip label="HQ" size="small" color="primary" />}
              </Box>

              {!config.isHeadBranch && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Cabang Pusat:
                  </Typography>
                  <Typography variant="body1">
                    {headStore?.name ?? config.headBranchName ?? '-'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Manager Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              avatar={<PersonIcon color="primary" />}
              title="Manager Toko"
              subheader="Pengguna yang bertanggung jawab atas cabang ini"
              action={
                <IconButton onClick={() => setEditManagerOpen(true)}>
                  <EditIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight={500}>
                  {currentManager?.name ?? config.managerName ?? '-'}
                </Typography>
              </Box>
              {currentManager?.email && (
                <Typography variant="body2" color="text.secondary">
                  {currentManager.email}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Cloud DB Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              avatar={<CloudIcon color="primary" />}
              title="Cloud Database"
              subheader="URL koneksi ke database cloud untuk sinkronisasi"
              action={
                <IconButton onClick={() => setEditCloudUrlOpen(true)}>
                  <EditIcon />
                </IconButton>
              }
            />
            <CardContent>
              {config.cloudDbUrl ? (
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'action.hover',
                    p: 1,
                    borderRadius: 1,
                    wordBreak: 'break-all'
                  }}
                >
                  {config.cloudDbUrl.replace(/:[^:@]+@/, ':***@')}
                </Typography>
              ) : (
                <Alert severity="info" variant="outlined">
                  Belum dikonfigurasi
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Actions */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadConfig}>
              Refresh Konfigurasi
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<WarningIcon />}
              onClick={() => setResetConfigOpen(true)}
            >
              Reset Konfigurasi
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Edit Manager Dialog */}
      <Dialog
        open={editManagerOpen}
        onClose={() => setEditManagerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ubah Manager Toko</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Manager"
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            sx={{ mt: 2 }}
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditManagerOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={handleSaveManager} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Cloud URL Dialog */}
      <Dialog
        open={editCloudUrlOpen}
        onClose={() => setEditCloudUrlOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ubah Cloud Database URL</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Cloud Database URL"
            value={cloudDbUrl}
            onChange={(e) => setCloudDbUrl(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/db"
            sx={{ mt: 2 }}
            helperText="Kosongkan jika tidak menggunakan cloud database"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCloudUrlOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={handleSaveCloudUrl} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Config Confirmation Dialog */}
      <Dialog open={resetConfigOpen} onClose={() => setResetConfigOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Reset Konfigurasi?
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Tindakan ini akan menghapus semua konfigurasi perangkat (cabang, manager, cloud URL).
            Anda akan diarahkan ke halaman setup untuk mengkonfigurasi ulang.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Data transaksi, produk, dan data lainnya tidak akan terhapus.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfigOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleResetConfig} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Reset Konfigurasi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
