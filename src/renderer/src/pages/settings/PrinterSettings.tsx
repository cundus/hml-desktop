import { useState, useEffect, useCallback } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material'
import {
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material'

type PrinterType = 'thermal' | 'hvs' | 'dotmatrix'
type PaperSize = '58mm' | '80mm' | 'A4' | 'A5'
type PrinterPurpose = 'receipt' | 'report' | 'invoice' | 'do'

interface PrinterConfig {
  id: string
  name: string
  printerName: string
  printerType: PrinterType
  paperSize: PaperSize
  purpose: PrinterPurpose
  isDefault: boolean
  copies: number
  createdAt: Date
  updatedAt: Date
}

interface StoreConfig {
  printerName?: string
  paperWidth: number
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
  autoPrint: boolean
}

const PRINTER_TYPES: { value: PrinterType; label: string }[] = [
  { value: 'thermal', label: 'Thermal (Struk)' },
  { value: 'hvs', label: 'HVS / Inkjet / Laser' },
  { value: 'dotmatrix', label: 'Dot Matrix' }
]

const PAPER_SIZES: { value: PaperSize; label: string; types: PrinterType[] }[] = [
  { value: '58mm', label: '58mm', types: ['thermal'] },
  { value: '80mm', label: '80mm', types: ['thermal'] },
  { value: 'A4', label: 'A4', types: ['hvs', 'dotmatrix'] },
  { value: 'A5', label: 'A5', types: ['hvs', 'dotmatrix'] }
]

const PURPOSES: { value: PrinterPurpose; label: string; icon: string }[] = [
  { value: 'receipt', label: 'Struk Kasir', icon: '🧾' },
  { value: 'report', label: 'Laporan', icon: '📊' },
  { value: 'invoice', label: 'Invoice', icon: '📄' },
  { value: 'do', label: 'Delivery Order', icon: '📦' }
]

const defaultFormData = {
  name: '',
  printerName: '',
  printerType: 'thermal' as PrinterType,
  paperSize: '58mm' as PaperSize,
  purpose: 'receipt' as PrinterPurpose,
  isDefault: false,
  copies: 1
}

export default function PrinterSettings(): React.JSX.Element {
  // Printer configs state
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(true)

  // Store config state (legacy)
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    paperWidth: 58,
    storeName: 'PETSHOP MANAGEMENT SYSTEM',
    storeAddress: 'Jl. Contoh No. 123, Jakarta',
    storePhone: '(021) 123-4567',
    storeEmail: 'info@petshop.com',
    autoPrint: false
  })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([])
  const [loadingWindowsPrinters, setLoadingWindowsPrinters] = useState(false)

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  })

  const loadPrinters = useCallback(async () => {
    try {
      setLoadingPrinters(true)
      const response = await window.api.db.printerConfigs.getAll()
      if (response.success && response.data) {
        setPrinters(response.data)
      }
    } catch {
      console.error('Failed to load printer configs')
    } finally {
      setLoadingPrinters(false)
    }
  }, [])

  const loadStoreConfig = useCallback(async () => {
    try {
      const response = await window.api.db.printer.getConfig()
      if (response.success && response.data) {
        setStoreConfig(response.data)
      }
    } catch {
      console.error('Failed to load store config')
    }
  }, [])

  useEffect(() => {
    void loadPrinters()
    void loadStoreConfig()
  }, [loadPrinters, loadStoreConfig])

  const showSnackbar = (message: string, severity: 'success' | 'error'): void => {
    setSnackbar({ open: true, message, severity })
  }

  const handleOpenDialog = (printer?: PrinterConfig): void => {
    if (printer) {
      setEditingPrinter(printer)
      setFormData({
        name: printer.name,
        printerName: printer.printerName,
        printerType: printer.printerType,
        paperSize: printer.paperSize,
        purpose: printer.purpose,
        isDefault: printer.isDefault,
        copies: printer.copies
      })
    } else {
      setEditingPrinter(null)
      setFormData(defaultFormData)
    }
    setDialogOpen(true)
    // Load available printers when dialog opens
    void loadAvailablePrinters()
  }

  const loadAvailablePrinters = async (): Promise<void> => {
    setLoadingWindowsPrinters(true)
    try {
      const response = await window.api.db.printer.getAvailablePrinters()
      if (response.success && response.data) {
        setAvailablePrinters(response.data)
      }
    } catch {
      console.error('Failed to load available printers')
    } finally {
      setLoadingWindowsPrinters(false)
    }
  }

  const handleCloseDialog = (): void => {
    setDialogOpen(false)
    setEditingPrinter(null)
    setFormData(defaultFormData)
  }

  const handleSavePrinter = async (): Promise<void> => {
    setSaving(true)
    try {
      if (editingPrinter) {
        const response = await window.api.db.printerConfigs.update(editingPrinter.id, formData)
        if (response.success) {
          showSnackbar('Printer berhasil diperbarui', 'success')
          await loadPrinters()
          handleCloseDialog()
        } else {
          showSnackbar('Gagal memperbarui printer', 'error')
        }
      } else {
        const response = await window.api.db.printerConfigs.create(formData)
        if (response.success) {
          showSnackbar('Printer berhasil ditambahkan', 'success')
          await loadPrinters()
          handleCloseDialog()
        } else {
          showSnackbar('Gagal menambahkan printer', 'error')
        }
      }
    } catch {
      showSnackbar('Terjadi kesalahan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePrinter = async (id: string): Promise<void> => {
    if (!confirm('Yakin ingin menghapus printer ini?')) return

    setDeleting(id)
    try {
      const response = await window.api.db.printerConfigs.delete(id)
      if (response.success) {
        showSnackbar('Printer berhasil dihapus', 'success')
        await loadPrinters()
      } else {
        showSnackbar('Gagal menghapus printer', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const handleSetDefault = async (id: string): Promise<void> => {
    try {
      const response = await window.api.db.printerConfigs.setDefault(id)
      if (response.success) {
        showSnackbar('Default printer diperbarui', 'success')
        await loadPrinters()
      } else {
        showSnackbar('Gagal mengubah default printer', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan', 'error')
    }
  }

  const handleSaveStoreConfig = async (): Promise<void> => {
    setSaving(true)
    try {
      const response = await window.api.db.printer.updateConfig(storeConfig)
      if (response.success) {
        showSnackbar('Pengaturan toko berhasil disimpan', 'success')
      } else {
        showSnackbar('Gagal menyimpan pengaturan toko', 'error')
      }
    } catch {
      showSnackbar('Terjadi kesalahan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const availablePaperSizes = PAPER_SIZES.filter((p) => p.types.includes(formData.printerType))

  const getTypeLabel = (type: PrinterType) => PRINTER_TYPES.find((t) => t.value === type)?.label

  // Group printers by purpose
  const printersByPurpose = PURPOSES.map((purpose) => ({
    ...purpose,
    printers: printers.filter((p) => p.purpose === purpose.value)
  }))

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Pengaturan Printer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfigurasi multiple printer untuk cetak struk, laporan, dan dokumen lainnya
          </Typography>
        </Box>

        {/* Printer List */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Daftar Printer</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Tambah Printer
              </Button>
            </Stack>

            {loadingPrinters ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : printers.length === 0 ? (
              <Alert severity="info">
                Belum ada printer terkonfigurasi. Klik "Tambah Printer" untuk memulai.
              </Alert>
            ) : (
              <Stack spacing={3}>
                {printersByPurpose
                  .filter((p) => p.printers.length > 0)
                  .map((purpose) => (
                    <Box key={purpose.value}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <span>{purpose.icon}</span>
                        {purpose.label}
                      </Typography>
                      <Stack spacing={1}>
                        {purpose.printers.map((printer) => (
                          <Card variant="outlined" key={printer.id}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSetDefault(printer.id)}
                                    color={printer.isDefault ? 'warning' : 'default'}
                                    title={printer.isDefault ? 'Default' : 'Set sebagai Default'}
                                  >
                                    {printer.isDefault ? <StarIcon /> : <StarBorderIcon />}
                                  </IconButton>
                                  <Box>
                                    <Typography fontWeight="medium">{printer.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {printer.printerName} • {getTypeLabel(printer.printerType)} •{' '}
                                      {printer.paperSize}
                                      {printer.copies > 1 && ` • ${printer.copies} copy`}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(printer)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeletePrinter(printer.id)}
                                    disabled={deleting === printer.id}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Divider />

        {/* Store Information (Legacy - for receipt header) */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informasi Toko (Header Struk)
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nama Toko"
                  value={storeConfig.storeName}
                  onChange={(e) =>
                    setStoreConfig((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Alamat Toko"
                  value={storeConfig.storeAddress}
                  onChange={(e) =>
                    setStoreConfig((prev) => ({ ...prev, storeAddress: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Telepon"
                  value={storeConfig.storePhone}
                  onChange={(e) =>
                    setStoreConfig((prev) => ({ ...prev, storePhone: e.target.value }))
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={storeConfig.storeEmail || ''}
                  onChange={(e) =>
                    setStoreConfig((prev) => ({ ...prev, storeEmail: e.target.value }))
                  }
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
                  checked={storeConfig.autoPrint}
                  onChange={(e) =>
                    setStoreConfig((prev) => ({ ...prev, autoPrint: e.target.checked }))
                  }
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
            onClick={handleSaveStoreConfig}
            disabled={saving}
            size="large"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
          </Button>
        </Box>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPrinter ? 'Edit Printer' : 'Tambah Printer Baru'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Nama Konfigurasi"
              placeholder="Contoh: Struk Kasir Depan"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />

            <FormControl fullWidth>
              <InputLabel>Printer Windows</InputLabel>
              <Select
                value={formData.printerName}
                label="Printer Windows"
                onChange={(e) => setFormData((prev) => ({ ...prev, printerName: e.target.value }))}
                disabled={loadingWindowsPrinters}
              >
                {loadingWindowsPrinters ? (
                  <MenuItem disabled>Mendeteksi printer...</MenuItem>
                ) : availablePrinters.length === 0 ? (
                  <MenuItem disabled>Tidak ada printer terdeteksi</MenuItem>
                ) : (
                  availablePrinters.map((printer) => (
                    <MenuItem key={printer} value={printer}>
                      {printer}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Tipe Printer</InputLabel>
              <Select
                value={formData.printerType}
                label="Tipe Printer"
                onChange={(e) => {
                  const type = e.target.value as PrinterType
                  const defaultSize =
                    PAPER_SIZES.find((p) => p.types.includes(type))?.value || '58mm'
                  setFormData((prev) => ({ ...prev, printerType: type, paperSize: defaultSize }))
                }}
              >
                {PRINTER_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Ukuran Kertas</InputLabel>
              <Select
                value={formData.paperSize}
                label="Ukuran Kertas"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, paperSize: e.target.value as PaperSize }))
                }
              >
                {availablePaperSizes.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Kegunaan</InputLabel>
              <Select
                value={formData.purpose}
                label="Kegunaan"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, purpose: e.target.value as PrinterPurpose }))
                }
              >
                {PURPOSES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.printerType === 'dotmatrix' && (
              <TextField
                fullWidth
                type="number"
                label="Jumlah Copy"
                value={formData.copies}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, copies: parseInt(e.target.value) || 1 }))
                }
                inputProps={{ min: 1, max: 5 }}
                helperText="Untuk multi-copy (dot matrix)"
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                />
              }
              label="Jadikan default untuk kegunaan ini"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Batal</Button>
          <Button
            variant="contained"
            onClick={handleSavePrinter}
            disabled={saving || !formData.name || !formData.printerName}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

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
