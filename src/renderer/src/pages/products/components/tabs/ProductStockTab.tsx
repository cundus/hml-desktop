import { useEffect, useState, useContext } from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import EditIcon from '@mui/icons-material/Edit'
import { globalAlert } from '../../../../lib/globalAlert'
import useAuth from '../../../../hooks/useAuth'
import BranchConfigContext from '../../../../contexts/BranchConfigContext'

interface StockItem {
  storeId: string
  storeName: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
}

interface ProductStockTabProps {
  productId: string
  productUnit: string
}

export default function ProductStockTab({
  productId,
  productUnit
}: ProductStockTabProps): React.JSX.Element {
  const { hasPermission, userId, userName } = useAuth()
  const branchConfig = useContext(BranchConfigContext)
  const branchStoreId = branchConfig?.storeId
  const canAdjust = hasPermission('inventory.manage')

  const [loading, setLoading] = useState(true)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; item: StockItem | null }>({
    open: false,
    item: null
  })
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    loadStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const loadStock = async (): Promise<void> => {
    setLoading(true)
    try {
      // Get all stores
      const storesRes = await window.api.db.stores.getAll()
      const stores = storesRes.data ?? []

      // Get product locations
      const items: StockItem[] = []

      for (const store of stores) {
        const locRes = await window.api.db.productLocations.getByProductAndStore(
          productId,
          store.id
        )
        const loc = locRes.data
        items.push({
          storeId: store.id,
          storeName: store.name,
          quantity: loc?.quantity ?? 0,
          reservedQuantity: loc?.reservedQuantity ?? 0,
          availableQuantity: (loc?.quantity ?? 0) - (loc?.reservedQuantity ?? 0)
        })
      }

      setStockItems(items)
    } catch (error) {
      console.error('Failed to load stock', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdjust = (item: StockItem): void => {
    setAdjustDialog({ open: true, item })
    setAdjustValue('')
    setAdjustNote('')
  }

  const handleCloseAdjust = (): void => {
    setAdjustDialog({ open: false, item: null })
  }

  const handleAdjust = async (): Promise<void> => {
    if (!adjustDialog.item) return

    const diff = Number(adjustValue)
    if (isNaN(diff) || diff === 0) {
      globalAlert.error('Masukkan nilai penyesuaian yang valid')
      return
    }

    setAdjusting(true)
    try {
      const res = await window.api.db.inventory.createStockAdjustment({
        productId,
        storeId: adjustDialog.item.storeId,
        difference: diff,
        note: adjustNote || undefined,
        performedBy: userId || userName || 'system'
      })

      if (res.success) {
        globalAlert.success('Stok berhasil disesuaikan')
        handleCloseAdjust()
        loadStock()
      } else {
        globalAlert.error(res.error ?? 'Gagal menyesuaikan stok')
      }
    } catch (error) {
      console.error('Failed to adjust stock', error)
      globalAlert.error('Gagal menyesuaikan stok')
    } finally {
      setAdjusting(false)
    }
  }

  // Calculate total stock
  const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAvailable = stockItems.reduce((sum, item) => sum + item.availableQuantity, 0)

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Summary */}
      <Stack direction="row" spacing={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total Stok
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {totalQuantity} {productUnit}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Tersedia
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="success.main">
            {totalAvailable} {productUnit}
          </Typography>
        </Paper>
      </Stack>

      {/* Stock per Store */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Toko</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Stok
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Dipesan
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Tersedia
              </TableCell>
              {canAdjust && <TableCell sx={{ fontWeight: 'bold' }}>Aksi</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {stockItems.map((item) => (
              <TableRow key={item.storeId} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{item.storeName}</Typography>
                    {item.storeId === branchStoreId && (
                      <Chip label="Aktif" size="small" color="primary" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {item.quantity} {productUnit}
                </TableCell>
                <TableCell align="right">
                  {item.reservedQuantity} {productUnit}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={item.availableQuantity < 10 ? 'error' : 'success.main'}
                    fontWeight="bold"
                  >
                    {item.availableQuantity} {productUnit}
                  </Typography>
                </TableCell>
                {canAdjust && (
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenAdjust(item)}
                    >
                      Adjust
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialog.open} onClose={handleCloseAdjust} maxWidth="xs" fullWidth>
        <DialogTitle>Penyesuaian Stok</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Toko: {adjustDialog.item?.storeName}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Jumlah Penyesuaian"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
              type="number"
              fullWidth
              helperText="Nilai positif = tambah, negatif = kurang"
              autoFocus
            />
            <TextField
              label="Catatan (opsional)"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdjust} disabled={adjusting}>
            Batal
          </Button>
          <Button onClick={handleAdjust} variant="contained" disabled={adjusting}>
            {adjusting ? 'Memproses...' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
