import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import SaveIcon from '@mui/icons-material/Save'
import { globalAlert } from '../../../../lib/globalAlert'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  categoryId?: string
}

interface Category {
  id: string
  name: string
}

interface ProductInfoTabProps {
  product: Product
  onUpdated: () => void
}

export default function ProductInfoTab({
  product,
  onUpdated
}: ProductInfoTabProps): React.JSX.Element {
  const [name, setName] = useState(product.name)
  const [sku, setSku] = useState(product.sku)
  const [unit, setUnit] = useState(product.unit)
  const [cost, setCost] = useState(product.cost)
  const [categoryId, setCategoryId] = useState(product.categoryId || '')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load categories
  useEffect(() => {
    const loadCategories = async (): Promise<void> => {
      try {
        const res = await window.api.db.categories.getAll()
        setCategories(res.data ?? [])
      } catch (error) {
        console.error('Failed to load categories', error)
      }
    }
    void loadCategories()
  }, [])

  // Reset form when product changes
  useEffect(() => {
    setName(product.name)
    setSku(product.sku)
    setUnit(product.unit)
    setCost(product.cost)
    setCategoryId(product.categoryId || '')
    setHasChanges(false)
  }, [product])

  // Track changes
  useEffect(() => {
    const changed =
      name !== product.name ||
      sku !== product.sku ||
      unit !== product.unit ||
      cost !== product.cost ||
      categoryId !== (product.categoryId || '')
    setHasChanges(changed)
  }, [name, sku, unit, cost, categoryId, product])

  const handleSave = async (): Promise<void> => {
    if (!name.trim() || !sku.trim()) {
      globalAlert.error('Nama dan SKU harus diisi')
      return
    }

    setSaving(true)
    try {
      const res = await window.api.db.products.update(product.id, {
        name: name.trim(),
        sku: sku.trim(),
        unit,
        cost,
        categoryId: categoryId || null
      })
      if (res.success) {
        globalAlert.success('Produk berhasil disimpan')
        onUpdated()
      } else {
        globalAlert.error(res.error ?? 'Gagal menyimpan produk')
      }
    } catch (error) {
      console.error('Failed to save product', error)
      globalAlert.error('Gagal menyimpan produk')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Stack spacing={2.5} maxWidth={500}>
        <TextField
          label="Nama Produk"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
        />

        <TextField
          label="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
          fullWidth
        />

        <TextField
          select
          label="Kategori"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">-- Tidak ada --</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField label="Satuan Dasar" value={unit} onChange={(e) => setUnit(e.target.value)} />

        <TextField
          label="Harga Modal (Base Cost)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          type="number"
          inputProps={{ min: 0 }}
        />

        {hasChanges && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Ada perubahan yang belum disimpan
          </Alert>
        )}

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </Stack>
    </Box>
  )
}
