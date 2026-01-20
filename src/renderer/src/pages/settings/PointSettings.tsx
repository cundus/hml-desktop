import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import SaveIcon from '@mui/icons-material/Save'
import StarIcon from '@mui/icons-material/Star'
import RedeemIcon from '@mui/icons-material/Redeem'
import TimerIcon from '@mui/icons-material/Timer'
import SettingsIcon from '@mui/icons-material/Settings'

export default function PointSettingsPage(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  // Form state
  const [isActive, setIsActive] = useState(true)
  const [pointPerRupiah, setPointPerRupiah] = useState('0.01')
  const [minTransaction, setMinTransaction] = useState('0')
  const [redemptionValue, setRedemptionValue] = useState('10')
  const [minRedemption, setMinRedemption] = useState(100)
  const [maxRedemptionPercent, setMaxRedemptionPercent] = useState(50)
  const [expiryMonths, setExpiryMonths] = useState(12)

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        const res = await window.api.db.points.getSettings()
        if (res.success && res.data) {
          setIsActive(res.data.isActive)
          setPointPerRupiah(res.data.pointPerRupiah)
          setMinTransaction(res.data.minTransaction)
          setRedemptionValue(res.data.redemptionValue)
          setMinRedemption(res.data.minRedemption)
          setMaxRedemptionPercent(res.data.maxRedemptionPercent)
          setExpiryMonths(res.data.expiryMonths)
        }
      } catch (err) {
        console.error('Failed to load point settings:', err)
        setSnackbar({ open: true, message: 'Gagal memuat pengaturan', severity: 'error' })
      } finally {
        setLoading(false)
      }
    }
    void loadSettings()
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      const res = await window.api.db.points.updateSettings({
        isActive,
        pointPerRupiah,
        minTransaction,
        redemptionValue,
        minRedemption,
        maxRedemptionPercent,
        expiryMonths
      })
      if (res.success) {
        setSnackbar({ open: true, message: 'Pengaturan berhasil disimpan', severity: 'success' })
      } else {
        setSnackbar({ open: true, message: res.error || 'Gagal menyimpan', severity: 'error' })
      }
    } catch (err) {
      console.error('Failed to save point settings:', err)
      setSnackbar({ open: true, message: 'Gagal menyimpan pengaturan', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Calculate preview values
  const previewEarning = 100000 * Number(pointPerRupiah)
  const previewRedemption = 1000 * Number(redemptionValue)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Pengaturan Member Points
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi program loyalty untuk pelanggan
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </Stack>

      {/* Status Toggle */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight="500">
                Status Program Points
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isActive
                  ? 'Program points aktif - pelanggan dapat mengumpulkan dan menukarkan poin'
                  : 'Program points nonaktif - poin tidak akan diberikan atau ditukarkan'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="success"
                  size="medium"
                />
              }
              label={isActive ? 'Aktif' : 'Nonaktif'}
              labelPlacement="start"
            />
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
        {/* Earning Rules */}
        <Card sx={{ flex: 1 }}>
          <CardHeader
            avatar={<StarIcon color="warning" />}
            title="Aturan Perolehan Poin"
            subheader="Bagaimana pelanggan mendapatkan poin"
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <TextField
                label="Poin per Rupiah"
                type="number"
                value={pointPerRupiah}
                onChange={(e) => setPointPerRupiah(e.target.value)}
                helperText={`Contoh: Belanja Rp100,000 → ${previewEarning.toLocaleString()} poin`}
                inputProps={{ step: 0.001, min: 0 }}
                fullWidth
              />
              <TextField
                label="Minimal Transaksi"
                type="number"
                value={minTransaction}
                onChange={(e) => setMinTransaction(e.target.value)}
                helperText="Transaksi di bawah nilai ini tidak mendapat poin (0 = tanpa batas)"
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rp</InputAdornment>
                }}
                inputProps={{ min: 0 }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Redemption Rules */}
        <Card sx={{ flex: 1 }}>
          <CardHeader
            avatar={<RedeemIcon color="success" />}
            title="Aturan Penukaran Poin"
            subheader="Bagaimana poin dapat ditukarkan"
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <TextField
                label="Nilai Tukar per Poin"
                type="number"
                value={redemptionValue}
                onChange={(e) => setRedemptionValue(e.target.value)}
                helperText={`Contoh: 1,000 poin = Rp${previewRedemption.toLocaleString()} diskon`}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rp</InputAdornment>
                }}
                inputProps={{ min: 1 }}
                fullWidth
              />
              <TextField
                label="Minimal Poin untuk Ditukar"
                type="number"
                value={minRedemption}
                onChange={(e) => setMinRedemption(Number(e.target.value))}
                helperText="Poin minimum yang harus dikumpulkan sebelum bisa ditukar"
                InputProps={{
                  endAdornment: <InputAdornment position="end">poin</InputAdornment>
                }}
                inputProps={{ min: 1 }}
                fullWidth
              />
              <TextField
                label="Maksimal Diskon dari Poin"
                type="number"
                value={maxRedemptionPercent}
                onChange={(e) => setMaxRedemptionPercent(Number(e.target.value))}
                helperText="Persentase maksimal dari total transaksi yang dapat dibayar dengan poin"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                inputProps={{ min: 1, max: 100 }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Expiry Rules */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<TimerIcon color="info" />}
          title="Masa Berlaku Poin"
          subheader="Berapa lama poin aktif sejak didapatkan"
        />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
            <TextField
              label="Masa Berlaku"
              type="number"
              value={expiryMonths}
              onChange={(e) => setExpiryMonths(Number(e.target.value))}
              helperText={
                expiryMonths === 0
                  ? 'Poin tidak pernah kadaluarsa'
                  : `Poin kadaluarsa ${expiryMonths} bulan setelah diperoleh`
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">bulan</InputAdornment>
              }}
              inputProps={{ min: 0 }}
              sx={{ width: 200 }}
            />
            <Alert severity="info" icon={<SettingsIcon />} sx={{ flex: 1 }}>
              <Typography variant="body2">
                <strong>Tips:</strong> Set ke 0 untuk poin yang tidak pernah kadaluarsa. Masa
                berlaku 12 bulan adalah standar industri untuk program loyalty.
              </Typography>
            </Alert>
          </Stack>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            📊 Ringkasan Konfigurasi
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Earning Rate
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {Number(pointPerRupiah) > 0
                  ? `1 poin per Rp${Math.round(1 / Number(pointPerRupiah)).toLocaleString()}`
                  : '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Nilai Tukar
              </Typography>
              <Typography variant="body2" fontWeight="500">
                1 poin = Rp{Number(redemptionValue).toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Min. Penukaran
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {minRedemption.toLocaleString()} poin
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Maks. Diskon
              </Typography>
              <Typography variant="body2" fontWeight="500">
                {maxRedemptionPercent}% dari total
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
