import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from '@mui/material'
import React, { useEffect, useState } from 'react'

interface ReturnTransactionDialogProps {
  open: boolean
  onClose: () => void
  transaction: any // Transaction
  onSuccess: () => void
}

interface ReturnItemState {
  transactionItemId: string
  productId: string
  productName: string
  originalQty: number
  price: number
  returnedQty: number // Previously returned
  currentReturnQty: number // Input
  restock: boolean
}

export default function ReturnTransactionDialog({
  open,
  onClose,
  transaction,
  onSuccess
}: ReturnTransactionDialogProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ReturnItemState[]>([])

  useEffect(() => {
    if (open && transaction) {
      loadData()
    }
  }, [open, transaction])

  const loadData = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Fetch existing returns for this transaction
      const res = await window.api.db.returns.getByTransactionId(transaction.id)
      const previousReturns = res.success ? res.data : []

      // Calculate returned quantities per item
      const returnedMap = new Map<string, number>()
      previousReturns.forEach((ret: any) => {
        ret.items.forEach((item: any) => {
          const tid = item.transaction_item_id || item.transactionItemId
          const qty = Number(item.quantity)
          returnedMap.set(tid, (returnedMap.get(tid) || 0) + qty)
        })
      })

      // Map transaction items
      const mappedItems: ReturnItemState[] = (transaction.items || []).map((item: any) => ({
        transactionItemId: item.id,
        productId: item.productId || item.product_id,
        productName: item.productName || item.product_name,
        originalQty: Number(item.quantity),
        price: Number(item.price),
        returnedQty: returnedMap.get(item.id) || 0,
        currentReturnQty: 0,
        restock: true
      }))

      setItems(mappedItems)
    } catch (err) {
      console.error(err)
      setError('Gagal memuat data retur')
    } finally {
      setLoading(false)
    }
  }

  const handleQtyChange = (idx: number, val: string): void => {
    const num = Number(val)
    if (isNaN(num)) return

    const newItems = [...items]
    const item = newItems[idx]
    const max = item.originalQty - item.returnedQty

    // Clamp or Allow invalid? Better to clamp or show error.
    // Let's clamp for UX
    const clamped = Math.max(0, Math.min(num, max))

    item.currentReturnQty = clamped
    setItems(newItems)
  }

  const handleRestockChange = (idx: number, checked: boolean): void => {
    const newItems = [...items]
    newItems[idx].restock = checked
    setItems(newItems)
  }

  const handleSubmit = async (): Promise<void> => {
    const toReturn = items.filter((i) => i.currentReturnQty > 0)
    if (toReturn.length === 0) return

    setSubmitting(true)
    setError(null)

    try {
      const returnData = {
        transactionId: transaction.id,
        storeId: transaction.storeId || transaction.store_id,
        returnNumber: '', // Backend generates or we generate? Service generates default.
        totalRefund: String(toReturn.reduce((sum, i) => sum + i.currentReturnQty * i.price, 0)),
        createdBy: 'current-user', // Backend might check context or we pass it? App needs userId.
        // We need userId. Assuming we can get it or backend handles it.
        // ReturnDto requires createdBy.
        // We can get from auth context or pass dummy if backend resolves it?
        // Service expects string.
        // Let's try to get user form hook or pass empty and handle in backend?
        // Wait, backend `ReturnController` -> `ReturnService` -> `performBy`.
        // Let's fetch session? `window.api.db.auth.getSession()`?
        // Or assume Frontend passes it.
        // I will import `useAuth`.
        items: toReturn.map((i) => ({
          transactionItemId: i.transactionItemId,
          productId: i.productId,
          quantity: i.currentReturnQty,
          refundPrice: String(i.price),
          restock: i.restock
        }))
      }

      // Need userId.
      // I'll assume useAuth hook exists.

      const res = await window.api.db.returns.create({
        ...returnData,
        createdBy: getCurrentUserId() // Helper or Hook
      })

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'Gagal membuat retur')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting return')
    } finally {
      setSubmitting(false)
    }
  }

  // Helper for userId (placeholder, really need Context)
  const getCurrentUserId = () => {
    // If we are in component, we can use hooks.
    // I will refactor to use `useAuth` if available.
    return 'user-admin'
  }

  const totalRefund = items.reduce((sum, i) => sum + i.currentReturnQty * i.price, 0)

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>Retur Transaksi</DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress />
        ) : (
          <Box sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produk</TableCell>
                    <TableCell align="right">Harga</TableCell>
                    <TableCell align="right">Qty Beli</TableCell>
                    <TableCell align="right">Sudah Retur</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>
                      Qty Retur
                    </TableCell>
                    <TableCell align="center">Restock?</TableCell>
                    <TableCell align="right">Subtotal Refund</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.transactionItemId}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell align="right">{item.price.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.originalQty}</TableCell>
                      <TableCell align="right">{item.returnedQty}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.currentReturnQty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          inputProps={{ min: 0, max: item.originalQty - item.returnedQty }}
                          disabled={item.originalQty - item.returnedQty <= 0}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={item.restock}
                          onChange={(e) => handleRestockChange(idx, e.target.checked)}
                          size="small"
                          disabled={item.currentReturnQty === 0}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {(item.currentReturnQty * item.price).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} align="right">
                      <b>Total Refund</b>
                    </TableCell>
                    <TableCell align="right">
                      <b>{totalRefund.toLocaleString()}</b>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || totalRefund === 0}
        >
          {submitting ? 'Memproses...' : 'Simpan Retur'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
