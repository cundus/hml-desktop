import { List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import AssessmentIcon from '@mui/icons-material/Assessment'
import Chip from '@mui/material/Chip'

export type LowStockAlert = {
  name: string
  onHand: number
  reorderPoint: number
  severity: 'Critical' | 'Warning'
}

export type PendingReturn = {
  code: string
  items: number
  days: number
}

export type UnpaidInvoice = {
  code: string
  amount: string
  status: string
}

export type AlertsPanelProps = {
  lowStock: LowStockAlert[]
  pendingReturns: PendingReturn[]
  unpaidInvoices: UnpaidInvoice[]
}

export default function AlertsPanel({
  lowStock,
  pendingReturns,
  unpaidInvoices
}: AlertsPanelProps): React.JSX.Element {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        flex: 1,
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
      }}
      elevation={3}
    >
      <Typography variant="subtitle1" gutterBottom>
        Alerts & Actions Needed
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        Low Stock
      </Typography>
      <List dense sx={{ mb: 1 }}>
        {lowStock.map((a, idx) => (
          <ListItem key={idx} sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <WarningAmberIcon
                color={a.severity === 'Critical' ? 'error' : 'warning'}
                fontSize="small"
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {a.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  On hand: {a.onHand} · Reorder at: {a.reorderPoint}
                </Typography>
              }
            />
            <Chip
              label={a.severity}
              size="small"
              color={a.severity === 'Critical' ? 'error' : 'warning'}
              variant="outlined"
            />
          </ListItem>
        ))}
      </List>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Pending Returns
      </Typography>
      <List dense sx={{ mb: 1 }}>
        {pendingReturns.map((r, idx) => (
          <ListItem key={idx} sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Inventory2Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {r.code}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  {r.items} items · {r.days} day{r.days > 1 ? 's' : ''} pending
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        Unpaid Invoices
      </Typography>
      <List dense>
        {unpaidInvoices.map((inv, idx) => (
          <ListItem key={idx} sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AssessmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {inv.code} · {inv.amount}
                </Typography>
              }
              secondary={
                <Typography
                  variant="caption"
                  color={inv.status.includes('overdue') ? 'error.main' : 'text.secondary'}
                  noWrap
                >
                  {inv.status}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
