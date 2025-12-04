import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Grid,
  Stack,
  Chip
} from '@mui/material'
import { Save as SaveIcon, Terminal as TestIcon } from '@mui/icons-material'

interface PrinterConfig {
  printerName: string
  paperWidth: number
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail: string
  autoPrint: boolean
}

interface PrinterStatus {
  connected: boolean
  printerName: string
  lastTest?: Date
}

export default function PrinterSettings(): React.JSX.Element {
  const [config, setConfig] = useState<PrinterConfig>({
    printerName: '',
    paperWidth: 58,
    storeName: 'PETSHOP MANAGEMENT SYSTEM',
    storeAddress: 'Jl. Contoh No. 123, Jakarta',
    storePhone: '(021) 123-4567',
    storeEmail: 'info@petshop.com',
    autoPrint: false
  })

  const [status, setStatus] = useState<PrinterStatus>({
    connected: false,
    printerName: 'Tidak terdeteksi'
  })

  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })

  useEffect(() => {
    void loadConfig()
    void checkPrinterStatus()
  }, [])

  const loadConfig = async (): Promise<void> => {
    try {
      const response = await window.api.db.printer.getConfig()
      if (response.success && response.data) {
        setConfig(response.data)
      }
    } catch {
      console.error('Failed to load printer config')
    }
  }

  const checkPrinterStatus = async (): Promise<void> => {
    try {
      const response = await window.api.db.printer.getStatus()
      if (response.success && response.data) {
        setStatus(response.data)
      }
    } catch {
      console.error('Failed to check printer status')
    }
  }

  const handleSave = async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await window.api.db.printer.updateConfig(config)
      if (response.success) {
        showSnackbar('Pengaturan printer berhasil disimpan', 'success')
        await checkPrinterStatus()
      } else {
        showSnackbar('Gagal menyimpan pengaturan printer', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat menyimpan pengaturan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTestPrint = async (): Promise<void> => {
    setTesting(true)
    try {
      const response = await window.api.db.printer.testPrint()
      console.log('Test print response:', response)

      if (response.success) {
        showSnackbar('Coba print berhasil', 'success')
        setStatus((prev) => ({
          ...prev,
          lastTest: new Date()
        }))
      } else {
        showSnackbar('Coba print gagal', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan saat mencoba print', 'error')
    } finally {
      setTesting(false)
    }
  }

  const showSnackbar = (message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity })
  }

  const handleConfigChange = (
    field: keyof PrinterConfig,
    value: string | number | boolean
  ): void => {
    setConfig((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Pengaturan Printer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi printer thermal untuk cetak struk dan laporan
          </Typography>
        </Box>

        {/* Printer Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status Printer
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={status.connected ? 'Terhubung' : 'Tidak Terhubung'}
                  color={status.connected ? 'success' : 'error'}
                  size="small"
                />
                <Typography variant="body2">Printer: {status.printerName}</Typography>
              </Box>
              {status.lastTest && (
                <Typography variant="caption" color="text.secondary">
                  Terakhir diuji: {status.lastTest.toLocaleString('id-ID')}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={handleTestPrint}
                  disabled={testing}
                >
                  {testing ? 'Mencoba...' : 'Coba Print'}
                </Button>
                <Button variant="outlined" onClick={checkPrinterStatus}>
                  Periksa Status
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Printer Configuration */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Konfigurasi Printer
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nama Printer"
                  value={config.printerName}
                  onChange={(e) => handleConfigChange('printerName', e.target.value)}
                  placeholder="Biarkan kosong untuk deteksi otomatis"
                  helperText="Kosongkan untuk deteksi printer otomatis"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Lebar Kertas</InputLabel>
                  <Select
                    value={config.paperWidth}
                    label="Lebar Kertas"
                    onChange={(e) => handleConfigChange('paperWidth', e.target.value)}
                  >
                    <MenuItem value={58}>58mm (Umum)</MenuItem>
                    <MenuItem value={80}>80mm (Lebar)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Store Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informasi Toko
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nama Toko"
                  value={config.storeName}
                  onChange={(e) => handleConfigChange('storeName', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Alamat Toko"
                  value={config.storeAddress}
                  onChange={(e) => handleConfigChange('storeAddress', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Telepon"
                  value={config.storePhone}
                  onChange={(e) => handleConfigChange('storePhone', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={config.storeEmail}
                  onChange={(e) => handleConfigChange('storeEmail', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pengaturan Tambahan
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoPrint}
                  onChange={(e) => handleConfigChange('autoPrint', e.target.checked)}
                />
              }
              label="Print otomatis setelah transaksi"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            size="large"
          >
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
