import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
// import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'

type StockOpnameSession = {
  id: string
  code: string
  date: string
  description?: string
  status: 'Draft' | 'In Progress' | 'Completed'
  varianceCount: number
}

export default function WarehouseStockOpnamePage(): React.JSX.Element {
  const [sessions, setSessions] = useState<StockOpnameSession[]>([
    {
      id: 'so1',
      code: 'SO-001',
      date: '2025-01-05',
      description: 'Monthly stock take',
      status: 'Completed',
      varianceCount: 3
    },
    {
      id: 'so2',
      code: 'SO-002',
      date: '2025-02-01',
      description: 'Dog food aisle',
      status: 'In Progress',
      varianceCount: 1
    }
  ])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')

  const openCreate = (): void => {
    setDescription('')
    setDate('')
    setDialogOpen(true)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const handleCreate = (): void => {
    const parsedDate = new Date(date)
    const isValidDate = !isNaN(parsedDate.getTime())
    const effectiveDate = isValidDate ? date : new Date().toISOString().slice(0, 10)
    const nextNumber = sessions.length + 1
    const newSession: StockOpnameSession = {
      id: `so${Date.now()}`,
      code: `SO-${String(nextNumber).padStart(3, '0')}`,
      date: effectiveDate,
      description,
      status: 'Draft',
      varianceCount: 0
    }
    setSessions((prev) => [newSession, ...prev])
    setDialogOpen(false)
  }

  const advanceStatus = (session: StockOpnameSession): void => {
    const nextStatus: StockOpnameSession['status'] =
      session.status === 'Draft'
        ? 'In Progress'
        : session.status === 'In Progress'
          ? 'Completed'
          : 'Completed'

    setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: nextStatus } : s)))
  }

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Warehouse - Stock Opname
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1">Stock Opname Sessions</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Stock Opname
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Variances</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No stock opname sessions
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id} hover>
                <TableCell>{session.code}</TableCell>
                <TableCell>{session.date}</TableCell>
                <TableCell>{session.description}</TableCell>
                <TableCell align="right">{session.varianceCount}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={session.status}
                    color={
                      session.status === 'Draft'
                        ? 'default'
                        : session.status === 'In Progress'
                          ? 'warning'
                          : 'success'
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => advanceStatus(session)}>
                    {session.status === 'Draft'
                      ? 'Start'
                      : session.status === 'In Progress'
                        ? 'Complete'
                        : 'Completed'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>New Stock Opname</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            margin="normal"
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
