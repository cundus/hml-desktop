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
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'

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
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [permRes, rolesRes, rolePermRes] = await Promise.all([
          window.api.db.permissions.getAll(),
          window.api.db.roles.getAll(),
          window.api.db.rolePermissions.getAll()
        ])

        if (permRes.success && rolesRes.success && rolePermRes.success) {
          const permData = permRes.data ?? []
          const rolesData = rolesRes.data ?? []
          const rolePermData = rolePermRes.data ?? []

          const loadedPermissions: PermissionDef[] = permData.map((p: any) => ({
            key: p.id as string,
            label: p.name as string,
            description: (p.description as string | null) ?? undefined
          }))

          const groupsFromRoles: PermissionGroup[] = rolesData.map((role: any) => {
            const permIds = rolePermData
              .filter((rp: any) => rp.roleId === role.id)
              .map((rp: any) => rp.permissionId as string)

            return {
              id: role.id as string,
              name: role.name as string,
              description: (role.description as string | null) ?? undefined,
              permissions: permIds
            }
          })

          setPermissions(loadedPermissions)
          setGroups(groupsFromRoles)
        }
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

  const getCategoryFromKey = (key: string): string => {
    const parts = key.split('.')
    if (parts.length < 2) return 'General'
    const prefix = parts[0]
    switch (prefix) {
      case 'sales':
        return 'Sales'
      case 'inventory':
        return 'Inventory'
      case 'purchasing':
        return 'Purchasing'
      case 'operations':
        return 'Operations'
      case 'pricing':
        return 'Pricing'
      case 'finance':
        return 'Finance'
      case 'master':
        return 'Master Data'
      case 'settings':
        return 'Settings'
      case 'dashboard':
        return 'Dashboard'
      case 'audit':
        return 'Audit'
      default:
        return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }
  }

  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      const category = getCategoryFromKey(perm.key)
      if (!acc[category]) acc[category] = []
      acc[category].push(perm)
      return acc
    },
    {} as Record<string, PermissionDef[]>
  )

  const filteredCategories = Object.entries(groupedPermissions)
    .map(([category, perms]) => {
      const filtered = perms.filter(
        (p) =>
          p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
      return { category, permissions: filtered, totalInGroup: perms.length }
    })
    .filter((group) => group.permissions.length > 0)

  const toggleCategory = (perms: PermissionDef[]): void => {
    const groupKeys = perms.map((p) => p.key)
    const allSelected = groupKeys.every((k) => formPermissions.includes(k))

    if (allSelected) {
      setFormPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)))
    } else {
      setFormPermissions((prev) => {
        const next = [...prev]
        groupKeys.forEach((k) => {
          if (!next.includes(k)) next.push(k)
        })
        return next
      })
    }
  }

  const allPermissionsSelected =
    permissions.length > 0 && formPermissions.length === permissions.length
  const somePermissionsSelected =
    formPermissions.length > 0 && formPermissions.length < permissions.length

  const toggleAllPermissions = (): void => {
    if (allPermissionsSelected) {
      setFormPermissions([])
    } else {
      setFormPermissions(permissions.map((p) => p.key))
    }
  }

  const handleSave = async (): Promise<void> => {
    const name = formName.trim() || 'New Group'
    const description = formDescription.trim()

    if (editingGroup) {
      const roleRes = await window.api.db.roles.update(editingGroup.id, {
        name,
        description: description || undefined
      })

      if (!roleRes.success || !roleRes.data) return

      const role = roleRes.data

      const permRes = await window.api.db.rolePermissions.setForRole(role.id, formPermissions)
      if (!permRes.success) return

      const updated: PermissionGroup = {
        id: role.id,
        name: role.name,
        description: (role.description as string | null) ?? undefined,
        permissions: formPermissions
      }

      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
    } else {
      const roleRes = await window.api.db.roles.create({
        name,
        description: description || undefined
      })

      if (!roleRes.success || !roleRes.data) return

      const role = roleRes.data

      const permRes = await window.api.db.rolePermissions.setForRole(role.id, formPermissions)
      if (!permRes.success) return

      const created: PermissionGroup = {
        id: role.id,
        name: role.name,
        description: (role.description as string | null) ?? undefined,
        permissions: formPermissions
      }

      setGroups((prev) => [...prev, created])
    }

    setDialogOpen(false)
  }

  const handleDelete = async (group: PermissionGroup): Promise<void> => {
    const res = await window.api.db.roles.delete(group.id)
    if (!res.success) return
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

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Permissions
              </Typography>

              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allPermissionsSelected}
                      indeterminate={somePermissionsSelected}
                      onChange={toggleAllPermissions}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      Select all permissions
                    </Typography>
                  }
                />
                <TextField
                  placeholder="Search permissions..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              <Box
                sx={{
                  maxHeight: 400,
                  overflowY: 'auto',
                  pr: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  '& .MuiAccordion-root': {
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:before': { display: 'none' },
                    boxShadow: 'none'
                  }
                }}
              >
                {filteredCategories.map(({ category, permissions: categoryPerms }) => {
                  const selectedInGroup = categoryPerms.filter((p) =>
                    formPermissions.includes(p.key)
                  ).length
                  const allInGroupSelected = selectedInGroup === categoryPerms.length
                  const someInGroupSelected = selectedInGroup > 0 && !allInGroupSelected

                  return (
                    <Accordion key={category} disableGutters defaultExpanded={!!searchQuery}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                        sx={{
                          flexDirection: 'row-reverse',
                          px: 1,
                          minHeight: '40px !important',
                          '& .MuiAccordionSummary-content': {
                            m: '0 !important',
                            alignItems: 'center',
                            gap: 1
                          }
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={allInGroupSelected}
                          indeterminate={someInGroupSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleCategory(categoryPerms)}
                          sx={{ p: 0.5 }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                          {category}
                        </Typography>
                        <Chip
                          label={`${selectedInGroup}/${categoryPerms.length}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1, pt: 0, pl: 5 }}>
                        <FormGroup>
                          {categoryPerms.map((perm) => (
                            <FormControlLabel
                              key={perm.key}
                              control={
                                <Checkbox
                                  checked={formPermissions.includes(perm.key)}
                                  onChange={() => togglePermission(perm.key)}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">{perm.label}</Typography>
                                  {perm.description && (
                                    <Typography variant="caption" color="text.secondary">
                                      {perm.description}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                        </FormGroup>
                      </AccordionDetails>
                    </Accordion>
                  )
                })}

                {filteredCategories.length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No permissions found matching "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </Box>
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
