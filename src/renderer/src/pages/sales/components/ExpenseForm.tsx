import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { formatCurrency } from '../../../utils/currency'

export interface ExpenseFormData {
  item: string
  quantity: number
  price: number
  description: string
}

export interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ExpenseFormData) => void
  initialData?: Partial<ExpenseFormData>
  loading?: boolean
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false
}) => {
  const [formData, setFormData] = React.useState<ExpenseFormData>({
    item: '',
    quantity: 1,
    price: 0,
    description: ''
  })

  const [errors, setErrors] = React.useState<Partial<Record<keyof ExpenseFormData, string>>>({})

  React.useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData
      }))
    }
  }, [initialData])

  const handleInputChange =
    (field: keyof ExpenseFormData): ((event: React.ChangeEvent<HTMLInputElement>) => void) =>
    (event) => {
      const value =
        field === 'item' || field === 'description'
          ? event.target.value
          : field === 'quantity'
            ? parseInt(event.target.value) || 0
            : parseFloat(event.target.value) || 0

      setFormData((prev) => ({
        ...prev,
        [field]: value
      }))

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: ''
        }))
      }
    }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExpenseFormData, string>> = {}

    if (!formData.item.trim()) {
      newErrors.item = 'Item name is required'
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleClose = () => {
    setFormData({
      item: '',
      quantity: 1,
      price: 0,
      description: ''
    })
    setErrors({})
    onClose()
  }

  const total = formData.quantity * formData.price

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Expense</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <TextField
              label="Item Name"
              value={formData.item}
              onChange={handleInputChange('item')}
              error={!!errors.item}
              helperText={errors.item}
              fullWidth
              disabled={loading}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange('quantity')}
                error={!!errors.quantity}
                helperText={errors.quantity}
                inputProps={{ min: 1 }}
                sx={{ width: '120px' }}
                disabled={loading}
              />

              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={handleInputChange('price')}
                error={!!errors.price}
                helperText={errors.price}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
                disabled={loading}
              />
            </Stack>

            <TextField
              label="Description (Optional)"
              value={formData.description}
              onChange={handleInputChange('description')}
              multiline
              rows={3}
              fullWidth
              disabled={loading}
            />

            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total Amount:
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(total)}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Add Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
