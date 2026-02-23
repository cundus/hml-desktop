import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import RestoreIcon from '@mui/icons-material/Restore'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { formatCurrency } from '../../../utils/currency'

export interface OpenBillSummary {
  id: string
  label: string | null
  subtotal: string
  discount: string
  total: string
  customerId: string | null
  salesName: string | null
  createdBy: string | null
  createdAt: Date
  itemCount?: number
}

interface OpenBillDialogProps {
  open: boolean
  mode: 'save' | 'list'
  onClose: () => void
  onSave: (label: string, notes?: string) => Promise<void>
  onRecall: (billId: string) => Promise<void>
  onDelete: (billId: string) => Promise<void>
  bills: OpenBillSummary[]
  loading?: boolean
  cartItemCount?: number
}

export default function OpenBillDialog({
  open,
  mode,
  onClose,
  onSave,
  onRecall,
  onDelete,
  bills,
  loading = false,
  cartItemCount = 0
}: OpenBillDialogProps): React.JSX.Element {
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open && mode === 'save') {
      setLabel('')
      setNotes('')
    }
  }, [open, mode])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await onSave(label, notes || undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (billId: string): Promise<void> => {
    setDeletingId(billId)
    try {
      await onDelete(billId)
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (date: Date): string => {
    const d = new Date(date)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date): string => {
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {mode === 'save' ? (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon color="primary" />
            Simpan Open Bill
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Simpan {cartItemCount} item dalam keranjang sebagai open bill untuk dilanjutkan nanti.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Label (opsional)"
              placeholder="Contoh: Meja 3, Pak Budi, dsb."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            />
            <TextField
              fullWidth
              label="Catatan (opsional)"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Batal</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || cartItemCount === 0}
            >
              {saving ? 'Menyimpan...' : 'Simpan Open Bill'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon color="primary" />
            Daftar Open Bill
            {bills.length > 0 && (
              <Chip label={bills.length} size="small" color="primary" sx={{ ml: 1 }} />
            )}
          </DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : bills.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  Tidak ada open bill
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Tekan F7 saat ada item di keranjang untuk menyimpan open bill.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {bills.map((bill, index) => (
                  <React.Fragment key={bill.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{
                        py: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {bill.label || `Open Bill #${index + 1}`}
                            </Typography>
                            {bill.itemCount != null && (
                              <Chip
                                label={`${bill.itemCount} item`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" fontWeight={500} color="primary.main">
                              {formatCurrency(parseFloat(bill.total))}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(bill.createdAt)} {formatTime(bill.createdAt)}
                            </Typography>
                            {bill.salesName && (
                              <Typography variant="caption" color="text.secondary">
                                Sales: {bill.salesName}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<RestoreIcon />}
                            onClick={() => onRecall(bill.id)}
                          >
                            Recall
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(bill.id)}
                            disabled={deletingId === bill.id}
                          >
                            {deletingId === bill.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Tutup</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
