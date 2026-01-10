import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Alert,
  CircularProgress,
  Autocomplete,
  Paper
} from '@mui/material'
import { LocalShipping as ShippingIcon, Print as PrintIcon } from '@mui/icons-material'
import { globalAlert } from '../../../lib/globalAlert'

interface Customer {
  id: string
  name: string
  address?: string
  code?: string
}

interface TransactionItem {
  productName?: string
  displayQuantity?: number
  quantity: number
  uomCode?: string
  weight?: number // in grams
}

interface TransactionData {
  id: string
  code: string
  createdAt: Date
  storeId?: string
  customerId: string | null
  customerName?: string
  customerAddress?: string
  items?: TransactionItem[]
}

interface DeliveryOrderModalProps {
  open: boolean
  transaction: TransactionData | null
  customers: Customer[]
  onClose: () => void
  onSuccess?: () => void
}

export default function DeliveryOrderModal({
  open,
  transaction,
  customers,
  onClose,
  onSuccess
}: DeliveryOrderModalProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [existingDO, setExistingDO] = useState<any>(null)

  // Form state
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0])
  const [sales, setSales] = useState<string>('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [manualCustomerName, setManualCustomerName] = useState<string>('')
  const [manualCustomerAddress, setManualCustomerAddress] = useState<string>('')

  useEffect(() => {
    if (open && transaction) {
      void loadExistingDO()
      void initializeForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction])

  const loadExistingDO = async (): Promise<void> => {
    if (!transaction) return
    try {
      const res = await window.api.db.deliveryOrders.findByTransactionId(transaction.id)
      if (res.success && res.data) {
        setExistingDO(res.data)
      } else {
        setExistingDO(null)
      }
    } catch (error) {
      console.error('Failed to check existing DO:', error)
    }
  }

  const initializeForm = async (): Promise<void> => {
    if (!transaction) return

    // Reset form
    setTanggal(new Date().toISOString().split('T')[0])
    setSales('')
    setManualCustomerName('')
    setManualCustomerAddress('')

    // Pre-fill customer if exists
    if (transaction.customerId) {
      const customer = customers.find((c) => c.id === transaction.customerId)
      if (customer) {
        setSelectedCustomer(customer)
        setManualCustomerName(customer.name)
        setManualCustomerAddress(customer.address || '')
      }
    } else if (transaction.customerName) {
      setManualCustomerName(transaction.customerName)
      setManualCustomerAddress(transaction.customerAddress || '')
    }
  }

  const handleCustomerChange = (_: any, customer: Customer | null): void => {
    setSelectedCustomer(customer)
    if (customer) {
      setManualCustomerName(customer.name)
      setManualCustomerAddress(customer.address || '')
    }
  }

  const handleCreateAndPrint = async (): Promise<void> => {
    if (!transaction) return

    const customerName = manualCustomerName.trim()
    if (!customerName) {
      globalAlert.error('Nama konsumen harus diisi')
      return
    }

    setLoading(true)
    setPrinting(true)

    try {
      // Create or use existing DO
      let deliveryOrder = existingDO
      
      if (!deliveryOrder) {
        const createRes = await window.api.db.deliveryOrders.create({
          transactionId: transaction.id,
          tanggal: new Date(tanggal),
          sales: sales.trim() || undefined,
          customerId: selectedCustomer?.id,
          customerName,
          customerAddress: manualCustomerAddress.trim() || undefined
        })

        if (!createRes.success || !createRes.data) {
          throw new Error(createRes.error || 'Gagal membuat surat jalan')
        }

        deliveryOrder = createRes.data
        setExistingDO(deliveryOrder)
      }

      // Prepare items for printing - weight * quantity = total weight per item
      const items = (transaction.items || []).map((item) => {
        const qty = item.displayQuantity || item.quantity
        const unitWeight = item.weight || 0
        return {
          productName: item.productName || 'Unknown Product',
          quantity: qty,
          uomCode: item.uomCode || 'PCS',
          weight: unitWeight * qty // Total weight = unit weight * quantity
        }
      })

      // Print - always use current form values, not saved DO values
      const printRes = await window.api.db.printer.printDeliveryOrder({
        noSuratJalan: deliveryOrder.noSuratJalan,
        tanggalSuratJalan: new Date(tanggal), // Use form tanggal
        receiptNumber: transaction.code,
        receiptDate: transaction.createdAt,
        sales: sales.trim() || null, // Use form sales
        customerName: customerName, // Use form customerName
        customerAddress: manualCustomerAddress.trim() || null, // Use form address
        storeId: transaction.storeId, // For branch info lookup
        items
      })

      if (printRes.success) {
        await window.api.db.deliveryOrders.markAsPrinted(deliveryOrder.id)
        globalAlert.success('Surat jalan berhasil dicetak')
        onSuccess?.()
        onClose()
      } else {
        globalAlert.error(printRes.error || 'Gagal mencetak surat jalan')
      }
    } catch (error) {
      console.error('Failed to create/print DO:', error)
      globalAlert.error(error instanceof Error ? error.message : 'Gagal membuat surat jalan')
    } finally {
      setLoading(false)
      setPrinting(false)
    }
  }

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatWeight = (grams: number): string => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} Kg`
    }
    return `${grams} gr`
  }

  if (!transaction) return <></>

  const items = transaction.items || []
  const totalQty = items.reduce((sum, item) => sum + (item.displayQuantity || item.quantity), 0)
  // Total weight = sum of (unit weight * quantity) for each item
  const totalWeight = items.reduce((sum, item) => {
    const qty = item.displayQuantity || item.quantity
    const unitWeight = item.weight || 0
    return sum + (unitWeight * qty)
  }, 0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShippingIcon />
        Cetak Surat Jalan
      </DialogTitle>
      <DialogContent dividers>
        {existingDO && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Surat jalan sudah pernah dibuat: <strong>{existingDO.noSuratJalan}</strong>
            {existingDO.printedAt && ` (Dicetak: ${formatDate(existingDO.printedAt)})`}
          </Alert>
        )}

        <Stack spacing={3}>
          {/* Form Section */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Data Surat Jalan
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                type="date"
                label="Tanggal Surat Jalan"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Sales"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
                size="small"
                placeholder="Nama sales (opsional)"
                sx={{ minWidth: 180 }}
              />
            </Stack>
          </Paper>

          {/* Customer Section */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Data Konsumen
            </Typography>
            <Stack spacing={2}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name}${option.code ? ` (${option.code})` : ''}`}
                value={selectedCustomer}
                onChange={handleCustomerChange}
                renderInput={(params) => (
                  <TextField {...params} label="Pilih Pelanggan" size="small" />
                )}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Nama Konsumen"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  size="small"
                  required
                  fullWidth
                  error={!manualCustomerName.trim()}
                  helperText={!manualCustomerName.trim() ? 'Wajib diisi' : ''}
                />
                <TextField
                  label="Alamat"
                  value={manualCustomerAddress}
                  onChange={(e) => setManualCustomerAddress(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
              </Stack>
            </Stack>
          </Paper>

          {/* Preview Section */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Preview Surat Jalan
            </Typography>

            {/* Header Preview */}
            <Box sx={{ textAlign: 'center', mb: 2, py: 1, borderBottom: '1px solid #ddd' }}>
              <Typography variant="h6" fontWeight="bold">
                SURAT JALAN
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {existingDO ? existingDO.noSuratJalan : '(Nomor akan digenerate)'}
              </Typography>
              <Typography variant="body2">
                Tanggal: {formatDate(tanggal)}
              </Typography>
            </Box>

            {/* Info Preview */}
            <Stack direction="row" spacing={4} mb={2}>
              <Box flex={1}>
                <Typography variant="body2">
                  <strong>No. Nota:</strong> {transaction.code}
                </Typography>
                <Typography variant="body2">
                  <strong>Tgl. Nota:</strong> {formatDate(transaction.createdAt)}
                </Typography>
                <Typography variant="body2">
                  <strong>Sales:</strong> {sales || '-'}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="body2">
                  <strong>Konsumen:</strong> {manualCustomerName || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>Alamat:</strong> {manualCustomerAddress || '-'}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* Items Table Preview */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40}>No</TableCell>
                  <TableCell>Nama Barang</TableCell>
                  <TableCell align="center" width={60}>Qty</TableCell>
                  <TableCell align="center" width={60}>Satuan</TableCell>
                  <TableCell align="right" width={80}>Tonase</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const qty = item.displayQuantity || item.quantity
                  const unitWeight = item.weight || 0
                  const itemTotalWeight = unitWeight * qty
                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.productName || '-'}</TableCell>
                      <TableCell align="center">{qty}</TableCell>
                      <TableCell align="center">{item.uomCode || 'PCS'}</TableCell>
                      <TableCell align="right">{formatWeight(itemTotalWeight)}</TableCell>
                    </TableRow>
                  )
                })}
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell colSpan={2} align="right">
                    <strong>TOTAL</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>{totalQty}</strong>
                  </TableCell>
                  <TableCell align="center">-</TableCell>
                  <TableCell align="right">
                    <strong>{formatWeight(totalWeight)}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {/* Footer Preview */}
            <Box mt={2} pt={2} borderTop="1px dashed #ccc">
              <Stack direction="row" justifyContent="space-between">
                <Box textAlign="center" width="30%">
                  <Typography variant="caption" fontWeight="bold">
                    Sopir
                  </Typography>
                  <Box height={40} />
                  <Typography variant="caption">( ____________ )</Typography>
                </Box>
                <Box textAlign="center" width="30%">
                  <Typography variant="caption" fontWeight="bold">
                    Kepala Toko/Gudang
                  </Typography>
                  <Box height={40} />
                  <Typography variant="caption">( ____________ )</Typography>
                </Box>
                <Box textAlign="center" width="30%">
                  <Typography variant="caption" fontWeight="bold">
                    Penerima
                  </Typography>
                  <Box height={40} />
                  <Typography variant="caption">( ____________ )</Typography>
                </Box>
              </Stack>
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Nominal Uang Diterima: ...................................
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Retur: ...................................
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Batal
        </Button>
        <Button
          variant="contained"
          startIcon={printing ? <CircularProgress size={16} /> : <PrintIcon />}
          onClick={handleCreateAndPrint}
          disabled={loading || !manualCustomerName.trim()}
        >
          {existingDO ? 'Cetak Ulang' : 'Buat & Cetak'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
