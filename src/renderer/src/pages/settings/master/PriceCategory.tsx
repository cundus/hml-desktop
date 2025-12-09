import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

interface PriceCategory {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  sortOrder: number
}

export default function PriceCategoryPage(): React.JSX.Element {
  const [categories, setCategories] = useState<PriceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<PriceCategory | null>(null)

  // Form state
  const [formId, setFormId] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState('0')

  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({ open: false, message: '', severity: 'success' })

  const loadCategories = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await window.api.db.priceCategories.getAll()
      setCategories(res.data ?? [])
    } catch (error) {
      console.error('Failed to load price categories', error)
      setSnackbar({ open: true, message: 'Gagal memuat data', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const openCreateDialog = (): void => {
    setEditingCategory(null)
    setFormId('')
    setFormName('')
    setFormDescription('')
    setFormSortOrder('0')
    setDialogOpen(true)
  }

  const openEditDialog = (cat: PriceCategory): void => {
    setEditingCategory(cat)
    setFormId(cat.id)
    setFormName(cat.name)
    setFormDescription(cat.description ?? '')
    setFormSortOrder(String(cat.sortOrder))
    setDialogOpen(true)
  }

  const openDeleteDialog = (cat: PriceCategory): void => {
    setDeletingCategory(cat)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (): Promise<void> => {
    if (!formName.trim()) {
      setSnackbar({ open: true, message: 'Nama kategori harus diisi', severity: 'error' })
      return
    }

    try {
      if (editingCategory) {
        // Update
        await window.api.db.priceCategories.update(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          sortOrder: Number(formSortOrder) || 0
        })
        setSnackbar({ open: true, message: 'Kategori berhasil diperbarui', severity: 'success' })
      } else {
        // Create
        await window.api.db.priceCategories.create({
          id: formId.trim().toUpperCase() || undefined,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          sortOrder: Number(formSortOrder) || 0
        })
        setSnackbar({ open: true, message: 'Kategori berhasil ditambahkan', severity: 'success' })
      }
      setDialogOpen(false)
      await loadCategories()
    } catch (error) {
      console.error('Failed to save price category', error)
      setSnackbar({ open: true, message: 'Gagal menyimpan kategori', severity: 'error' })
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deletingCategory) return

    try {
      const res = await window.api.db.priceCategories.delete(deletingCategory.id)
      if (!res.success) {
        setSnackbar({ open: true, message: res.error ?? 'Gagal menghapus', severity: 'error' })
        return
      }
      setSnackbar({ open: true, message: 'Kategori berhasil dihapus', severity: 'success' })
      setDeleteDialogOpen(false)
      await loadCategories()
    } catch (error) {
      console.error('Failed to delete price category', error)
      setSnackbar({ open: true, message: 'Gagal menghapus kategori', severity: 'error' })
    }
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5">Kategori Harga</Typography>
          <Typography variant="body2" color="text.secondary">
            Kelola kategori harga untuk pelanggan (RETAIL, WHOLESALE, MEMBER, dll.)
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Tambah Kategori
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nama</TableCell>
              <TableCell>Deskripsi</TableCell>
              <TableCell align="center">Urutan</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Belum ada kategori harga
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {cat.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {cat.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {cat.description ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{cat.sortOrder}</TableCell>
                  <TableCell align="center">
                    {cat.isDefault && (
                      <Chip label="Default" size="small" color="primary" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(cat)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog(cat)}
                      disabled={cat.isDefault}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Kategori Harga' : 'Tambah Kategori Harga'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingCategory && (
              <TextField
                label="ID Kategori"
                value={formId}
                onChange={(e) => setFormId(e.target.value.toUpperCase())}
                placeholder="RETAIL, WHOLESALE, MEMBER, dll."
                helperText="Opsional. Jika kosong, ID akan di-generate otomatis."
                fullWidth
              />
            )}
            <TextField
              label="Nama Kategori"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Deskripsi"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Urutan Tampil"
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(e.target.value)}
              helperText="Angka kecil tampil lebih dulu"
              sx={{ width: 150 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={handleSave}>
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Hapus Kategori Harga?</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus kategori <strong>{deletingCategory?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Kategori yang sudah digunakan untuk harga produk tidak bisa dihapus.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Hapus
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
