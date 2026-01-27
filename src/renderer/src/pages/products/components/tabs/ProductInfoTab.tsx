import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import SaveIcon from '@mui/icons-material/Save'
import { globalAlert } from '../../../../lib/globalAlert'

interface Product {
  id: string
  sku: string
  name: string
  unit: string
  cost: string
  weight?: string
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
  const [weight, setWeight] = useState(product.weight || '0')
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
    setWeight(product.weight || '0')
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
      weight !== (product.weight || '0') ||
      categoryId !== (product.categoryId || '')
    setHasChanges(changed)
  }, [name, sku, unit, cost, weight, categoryId, product])

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
        weight,
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
    <Box sx={{ pt: 2 }}>
      <Grid container spacing={2}>
        {/* Row 1: Name and SKU */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Nama Produk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
            fullWidth
            size="small"
          />
        </Grid>

        {/* Row 2: Category and Unit */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="Kategori"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="">-- Tidak ada --</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Satuan Dasar"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>

        {/* Row 3: Cost and Weight */}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Harga Modal (Rp)"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            type="number"
            inputProps={{ min: 0 }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Berat (gram)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
            inputProps={{ min: 0 }}
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>

      {/* Actions */}
      <Stack direction="row" spacing={2} mt={3} alignItems="center">
        {hasChanges && (
          <Alert severity="info" sx={{ py: 0, flex: 1 }}>
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

