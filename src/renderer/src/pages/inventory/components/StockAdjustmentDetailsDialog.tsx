import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Grid,
  IconButton
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { StockAdjustment } from 'src/preload/api/inventory'

interface StockAdjustmentDetailsDialogProps {
  open: boolean
  onClose: () => void
  adjustment: (StockAdjustment & { productName: string; storeName: string }) | null
}

export default function StockAdjustmentDetailsDialog({
  open,
  onClose,
  adjustment
}: StockAdjustmentDetailsDialogProps): React.ReactElement {
  if (!adjustment) return <></>

  const isNegative = adjustment.difference < 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Detail Penyesuaian Stok</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          <Grid container spacing={2}>
            {/* Header Info */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  color={isNegative ? 'error.main' : 'success.main'}
                  fontWeight="bold"
                >
                  {isNegative ? '' : '+'}
                  {adjustment.difference}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Unit
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* Product & Store */}
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Produk
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {adjustment.productName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Toko
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {adjustment.storeName}
              </Typography>
            </Grid>

            {/* Date & User */}
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Waktu Penyesuaian
              </Typography>
              <Typography variant="body1">
                {new Date(adjustment.createdAt).toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Dilakukan Oleh
              </Typography>
              <Typography variant="body1">{adjustment.performedBy}</Typography>
            </Grid>

            {/* Notes */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">
                Catatan
              </Typography>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, mt: 0.5 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {adjustment.note || 'Tidak ada catatan'}
                </Typography>
              </Box>
            </Grid>

            {/* System Info */}
            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                ID Penyesuaian: {adjustment.id}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  )
}
