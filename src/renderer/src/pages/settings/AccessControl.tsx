import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import api from '../../lib/api'

export type PermissionDef = {
  key: string
  label: string
  description?: string
}

export type PermissionGroup = {
  id: string
  name: string
  description?: string
  permissions: string[]
}

export default function AccessControlPage(): React.JSX.Element {
  const [permissions, setPermissions] = useState<PermissionDef[]>([])
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPermissions, setFormPermissions] = useState<string[]>([])

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [permRes, groupRes] = await Promise.all([
          api.get<PermissionDef[]>('/auth/permissions'),
          api.get<PermissionGroup[]>('/auth/groups')
        ])
        setPermissions(permRes.data ?? [])
        setGroups(groupRes.data ?? [])
      } catch {
        return
      }
    }
    void load()
  }, [])

  const openCreate = (): void => {
    setEditingGroup(null)
    setFormName('')
    setFormDescription('')
    setFormPermissions([])
    setDialogOpen(true)
  }

  const openEdit = (group: PermissionGroup): void => {
    setEditingGroup(group)
    setFormName(group.name)
    setFormDescription(group.description ?? '')
    setFormPermissions(group.permissions)
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const togglePermission = (key: string): void => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const handleSave = async (): Promise<void> => {
    const payload: Partial<PermissionGroup> = {
      name: formName.trim() || 'New Group',
      description: formDescription.trim(),
      permissions: formPermissions
    }

    if (editingGroup) {
      const res = await api.put<PermissionGroup>(`/auth/groups/${editingGroup.id}`, payload)
      const updated = res.data
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } else {
      const res = await api.post<PermissionGroup>('/auth/groups', payload)
      setGroups((prev) => [...prev, res.data])
    }

    setDialogOpen(false)
  }

  const handleDelete = async (group: PermissionGroup): Promise<void> => {
    await api.delete(`/auth/groups/${group.id}`)
    setGroups((prev) => prev.filter((g) => g.id !== group.id))
  }

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Roles & Permissions
      </Typography>

      <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1">Permission Groups</Typography>
          <Button variant="contained" size="small" onClick={openCreate}>
            New group
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Permissions</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No groups defined.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.description}</TableCell>
                  <TableCell align="center">{group.permissions.length}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEdit(group)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDelete(group)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingGroup ? 'Edit group' : 'New group'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Group name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Permissions
              </Typography>
              <FormGroup>
                {permissions.map((perm) => (
                  <FormControlLabel
                    key={perm.key}
                    control={
                      <Checkbox
                        checked={formPermissions.includes(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                        size="small"
                      />
                    }
                    label={perm.label}
                  />
                ))}
              </FormGroup>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSave()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
