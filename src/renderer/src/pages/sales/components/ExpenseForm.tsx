import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import CurrencyInput from '../../../components/CurrencyInput'
import { formatCurrency } from '../../../utils/currency'

export interface ExpenseFormData {
  categoryId?: string
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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState<ExpenseFormData>({
    categoryId: '',
    item: '',
    quantity: 1,
    price: 0,
    description: ''
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({})

  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData
      }))
    }
  }, [initialData])

  const loadCategories = async (): Promise<void> => {
    try {
      const response = await window.api.db.expenseCategories.getByType('shift')
      if (response.success && response.data) {
        setCategories(response.data)
      }
    } catch (error) {
      console.error('Failed to load expense categories:', error)
    }
  }

  const handleInputChange =
    (field: keyof ExpenseFormData): ((event: React.ChangeEvent<HTMLInputElement>) => void) =>
    (event) => {
      const value =
        field === 'item' || field === 'description' || field === 'categoryId'
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
      newErrors.item = 'Nama item wajib diisi'
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Jumlah harus lebih dari 0'
    }

    if (formData.price <= 0) {
      newErrors.price = 'Harga harus lebih dari 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (): void => {
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleClose = (): void => {
    setFormData({
      categoryId: '',
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
      <DialogTitle>Catat Pengeluaran</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Kategori (Opsional)</InputLabel>
              <Select
                value={formData.categoryId}
                label="Kategori (Opsional)"
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Tidak ada kategori</em>
                </MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Nama Item / Keterangan"
              value={formData.item}
              onChange={handleInputChange('item')}
              error={!!errors.item}
              helperText={errors.item}
              fullWidth
              disabled={loading}
              placeholder="Contoh: Beli Es Batu"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Jumlah"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange('quantity')}
                error={!!errors.quantity}
                helperText={errors.quantity}
                inputProps={{ min: 1 }}
                sx={{ width: '120px' }}
                disabled={loading}
              />

              <CurrencyInput
                label="Harga Satuan"
                value={formData.price}
                onChange={(value) => setFormData((prev) => ({ ...prev, price: value }))}
                error={!!errors.price}
                helperText={errors.price}
                fullWidth
                disabled={loading}
              />
            </Stack>

            <TextField
              label="Catatan Tambahan (Opsional)"
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
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
                bgcolor: 'grey.50'
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Total Pengeluaran:</Typography>
                <Typography variant="h6" color="error.main" fontWeight="bold">
                  {formatCurrency(total)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Batal
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="warning" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
