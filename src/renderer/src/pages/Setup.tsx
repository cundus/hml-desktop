import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StorefrontIcon from '@mui/icons-material/Storefront'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import PersonIcon from '@mui/icons-material/Person'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { globalAlert } from '../lib/globalAlert'
import useBranchConfig from '../hooks/useBranchConfig'

interface Store {
  id: string
  name: string
  address?: string
}

interface User {
  id: string
  name: string
  email: string
  storeId?: string | null
}

const steps = ['Sinkronisasi Cloud', 'Pilih Cabang', 'Pilih Manager', 'Selesai']

export default function SetupPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { refresh: refreshBranchConfig } = useBranchConfig()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [isHeadBranch, setIsHeadBranch] = useState(false)
  const [headBranchId, setHeadBranchId] = useState('')
  const [cloudDbUrl, setCloudDbUrl] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')

  const checkConfig = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      // Check if already configured
      const configRes = await window.api.db.appConfig.isConfigured()
      if (configRes.success && configRes.data) {
        // Already configured, redirect to login
        navigate('/login')
        return
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    checkConfig()
  }, [checkConfig])

  const loadStoresAndUsers = async (): Promise<void> => {
    try {
      // Load stores
      const storesRes = await window.api.db.stores.getAll()
      if (storesRes.success && storesRes.data) {
        setStores(storesRes.data)
      }

      // Load users
      const usersRes = await window.api.db.users.getAll()
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleSyncFromCloud = async (): Promise<void> => {
    if (!cloudDbUrl.trim()) {
      globalAlert.warning('Silakan masukkan URL database cloud')
      return
    }

    try {
      setSyncing(true)
      setError(null)
      setSyncProgress('Menghubungkan ke cloud database...')

      // Connect to cloud
      const connectRes = await window.api.db.sync.connect(cloudDbUrl)
      if (!connectRes.success) {
        globalAlert.error(`Gagal terhubung: ${connectRes.error}`)
        return
      }

      setSyncProgress('Mengunduh data dari cloud...')

      // Pull data from cloud
      const pullRes = await window.api.db.sync.pull()
      if (!pullRes.success) {
        globalAlert.error(`Gagal sinkronisasi: ${pullRes.error}`)
        return
      }

      setSyncProgress('Memuat data...')

      // Load stores and users after sync
      await loadStoresAndUsers()

      globalAlert.success(`Berhasil mengunduh ${pullRes.data?.pulled ?? 0} data dari cloud!`)
      setActiveStep(1)
    } catch (err) {
      globalAlert.error((err as Error).message)
    } finally {
      setSyncing(false)
      setSyncProgress('')
    }
  }

  const handleSkipSync = async (): Promise<void> => {
    // Load local data without sync
    await loadStoresAndUsers()
    setActiveStep(1)
  }

  const handleNext = (): void => {
    if (activeStep === 1) {
      if (!selectedStoreId) {
        globalAlert.warning('Silakan pilih cabang terlebih dahulu')
        return
      }
      if (!isHeadBranch && !headBranchId) {
        globalAlert.warning('Silakan pilih cabang pusat')
        return
      }
    }
    if (activeStep === 2) {
      if (!selectedManagerId) {
        globalAlert.warning('Silakan pilih manager toko')
        return
      }
    }
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = (): void => {
    setActiveStep((prev) => prev - 1)
  }

  const handleFinish = async (): Promise<void> => {
    try {
      setSaving(true)
      setError(null)

      const selectedStore = stores.find((s) => s.id === selectedStoreId)
      const headStore = isHeadBranch ? selectedStore : stores.find((s) => s.id === headBranchId)

      if (!selectedStore) {
        globalAlert.error('Cabang tidak ditemukan')
        return
      }

      const selectedManager = users.find((u) => u.id === selectedManagerId)

      const response = await window.api.db.appConfig.setup({
        branchId: selectedStoreId,
        branchName: selectedStore.name,
        headBranchId: isHeadBranch ? selectedStoreId : headBranchId,
        headBranchName: headStore?.name,
        isHeadBranch,
        cloudDbUrl: cloudDbUrl || undefined,
        managerId: selectedManagerId,
        managerName: selectedManager?.name
      })

      if (response.success) {
        // Refresh branch configuration context so guards see the updated config
        await refreshBranchConfig()
        globalAlert.success('Konfigurasi berhasil disimpan!')
        setActiveStep(3)
      } else {
        globalAlert.error(response.error ?? 'Gagal menyimpan konfigurasi')
      }
    } catch (err) {
      globalAlert.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleGoToApp = (): void => {
    navigate('/login')
  }

  // Filter users for selected store (or all if HQ)
  const availableManagers = users.filter(
    (u) => isHeadBranch || !u.storeId || u.storeId === selectedStoreId
  )

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Setup Aplikasi
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Konfigurasi awal untuk perangkat ini
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step 0: Cloud Sync */}
          {activeStep === 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CloudDownloadIcon color="primary" />
                <Typography variant="h6">Sinkronisasi Cloud</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                Langkah pertama adalah mengunduh data dari cloud database. Pastikan Anda memiliki
                koneksi internet dan URL database yang valid.
              </Alert>

              <TextField
                fullWidth
                label="Cloud Database URL"
                value={cloudDbUrl}
                onChange={(e) => setCloudDbUrl(e.target.value)}
                placeholder="postgresql://user:pass@host:5432/db"
                sx={{ mb: 2 }}
                disabled={syncing}
              />

              {syncing && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" align="center">
                    {syncProgress}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Step 1: Select Branch */}
          {activeStep === 1 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <StorefrontIcon color="primary" />
                <Typography variant="h6">Pilih Cabang</Typography>
              </Box>

              {stores.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Tidak ada data toko. Silakan sinkronisasi dari cloud terlebih dahulu atau
                  tambahkan toko secara manual.
                </Alert>
              ) : (
                <>
                  <TextField
                    select
                    fullWidth
                    label="Cabang"
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    sx={{ mb: 3 }}
                    helperText="Pilih cabang yang akan digunakan di perangkat ini"
                  >
                    {stores.map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        {store.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={isHeadBranch}
                        onChange={(e) => {
                          setIsHeadBranch(e.target.checked)
                          if (e.target.checked) {
                            setHeadBranchId(selectedStoreId)
                          }
                        }}
                      />
                    }
                    label="Ini adalah Cabang Pusat (HQ)"
                    sx={{ mb: 3 }}
                  />

                  {!isHeadBranch && (
                    <TextField
                      select
                      fullWidth
                      label="Cabang Pusat"
                      value={headBranchId}
                      onChange={(e) => setHeadBranchId(e.target.value)}
                      sx={{ mb: 3 }}
                      helperText="Pilih cabang pusat untuk sinkronisasi"
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.id} value={store.id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Step 2: Select Manager */}
          {activeStep === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6">Pilih Manager Toko</Typography>
              </Box>

              {availableManagers.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Tidak ada data user. Silakan sinkronisasi dari cloud terlebih dahulu atau
                  tambahkan user secara manual.
                </Alert>
              ) : (
                <TextField
                  select
                  fullWidth
                  label="Manager Toko"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  sx={{ mb: 3 }}
                  helperText="Pilih user yang akan menjadi manager untuk cabang ini"
                >
                  {availableManagers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          )}

          {/* Step 3: Complete */}
          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Konfigurasi Selesai!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Perangkat ini telah dikonfigurasi sebagai:
              </Typography>
              <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                {stores.find((s) => s.id === selectedStoreId)?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {isHeadBranch ? '(Cabang Pusat)' : '(Cabang)'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manager: {users.find((u) => u.id === selectedManagerId)?.name}
              </Typography>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0 || activeStep === 3} onClick={handleBack}>
              Kembali
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {activeStep === 0 && (
                <>
                  <Button variant="outlined" onClick={handleSkipSync} disabled={syncing}>
                    Lewati
                  </Button>
                  <Button variant="contained" onClick={handleSyncFromCloud} disabled={syncing}>
                    {syncing ? <CircularProgress size={24} /> : 'Sinkronisasi'}
                  </Button>
                </>
              )}
              {activeStep === 1 && (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={stores.length === 0 || !selectedStoreId}
                >
                  Lanjut
                </Button>
              )}
              {activeStep === 2 && (
                <Button
                  variant="contained"
                  onClick={handleFinish}
                  disabled={saving || !selectedManagerId}
                >
                  {saving ? <CircularProgress size={24} /> : 'Simpan & Selesai'}
                </Button>
              )}
              {activeStep === 3 && (
                <Button variant="contained" color="success" onClick={handleGoToApp}>
                  Masuk ke Aplikasi
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
