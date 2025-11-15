import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography
} from '@mui/material'

export type TopProduct = {
  rank: number
  name: string
  sku: string
  category: string
  units: number
  revenue: string
}

export type TopProductsListProps = {
  items: TopProduct[]
}

export default function TopProductsList({ items }: TopProductsListProps): React.JSX.Element {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0
      }}
      elevation={3}
    >
      <Typography variant="subtitle1" gutterBottom>
        Top 5 Best-Selling Products
      </Typography>
      <List dense>
        {items.map((p) => (
          <ListItem
            key={p.rank}
            sx={{
              px: 0,
              '&:not(:last-of-type)': { borderBottom: '1px solid', borderColor: 'divider' }
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Chip
                label={`#${p.rank}`}
                size="small"
                color={p.rank === 1 ? 'primary' : 'default'}
                variant={p.rank === 1 ? 'filled' : 'outlined'}
              />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap>
                  {p.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary" noWrap>
                  {p.sku} · {p.category}
                </Typography>
              }
            />
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2">{p.units} pcs</Typography>
              <Typography variant="caption" color="text.secondary">
                {p.revenue}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  )
}
