import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import InventoryIcon from '@mui/icons-material/Inventory'
import AssessmentIcon from '@mui/icons-material/Assessment'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PeopleIcon from '@mui/icons-material/People'

export type QuickNavItemKey = 'pos' | 'inventory' | 'reports' | 'suppliers' | 'users'

export type QuickNavItem = {
  key: QuickNavItemKey
  label: string
  description: string
  path: string
}

export type QuickNavigationProps = {
  items: QuickNavItem[]
  onNavigate: (path: string) => void
}

function getIcon(key: QuickNavItemKey): React.JSX.Element {
  switch (key) {
    case 'pos':
      return <PointOfSaleIcon />
    case 'inventory':
      return <InventoryIcon />
    case 'reports':
      return <AssessmentIcon />
    case 'suppliers':
      return <LocalShippingIcon />
    case 'users':
    default:
      return <PeopleIcon />
  }
}

export default function QuickNavigation({
  items,
  onNavigate
}: QuickNavigationProps): React.JSX.Element {
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
        Quick Navigation
      </Typography>
      <Grid container spacing={1}>
        {items.map((item) => (
          <Grid key={item.key} size={{ xs: 12, md: 6 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => onNavigate(item.path)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                borderRadius: 2,
                borderColor: 'divider',
                py: 1.2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                {getIcon(item.key)}
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2">{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Paper>
  )
}
