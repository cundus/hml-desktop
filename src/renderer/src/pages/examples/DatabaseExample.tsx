import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material'

type User = {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  unit: string
  cost: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export default function DatabaseExample(): React.JSX.Element {
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')

  // Load users from database
  const loadUsers = async (): Promise<void> => {
    try {
      setLoading(true)
      const result = await window.api.db.users.getAll()
      setUsers(result)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load products from database
  const loadProducts = async (): Promise<void> => {
    try {
      setLoading(true)
      const result = await window.api.db.products.getAll()
      setProducts(result)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new user
  const handleCreateUser = async (): Promise<void> => {
    try {
      await window.api.db.users.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword
      })
      setDialogOpen(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      await loadUsers()
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  // Soft delete a user
  const handleDeleteUser = async (id: string): Promise<void> => {
    try {
      await window.api.db.users.softDelete(id)
      await loadUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  // Soft delete a product
  const handleDeleteProduct = async (id: string): Promise<void> => {
    try {
      await window.api.db.products.softDelete(id)
      await loadProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  // Load data on mount
  useEffect(() => {
    void loadUsers()
    void loadProducts()
  }, [])

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Database Example (Prisma via IPC)
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        This page demonstrates how to use Prisma from the renderer process via IPC.
      </Typography>

      {/* Users Section */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Users</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={loadUsers} disabled={loading}>
              Refresh
            </Button>
            <Button variant="contained" onClick={() => setDialogOpen(true)}>
              Add User
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => void handleDeleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Products Section */}
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Products</Typography>
          <Button variant="outlined" onClick={loadProducts} disabled={loading}>
            Refresh
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell align="right">{product.cost.toLocaleString()}</TableCell>
                  <TableCell align="center">{product.isActive ? '✓' : '✗'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => void handleDeleteProduct(product.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Name"
            fullWidth
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Email"
            type="email"
            fullWidth
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Password"
            type="password"
            fullWidth
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
