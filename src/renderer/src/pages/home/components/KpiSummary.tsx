import { Box, Grid, Paper, Stack, Chip, Typography, LinearProgress } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import AssessmentIcon from '@mui/icons-material/Assessment'
import BarChartIcon from '@mui/icons-material/BarChart'

export type KpiItem = {
  key: string
  label: string
  value: string
  changeLabel: string
  changeColor: string
  type?: 'revenue' | 'orders' | 'inventory' | 'margin'
}

function getIcon(type?: KpiItem['type']): React.JSX.Element | null {
  switch (type) {
    case 'revenue':
      return <TrendingUpIcon fontSize="small" />
    case 'orders':
      return <ShoppingCartIcon fontSize="small" />
    case 'inventory':
      return <Inventory2Icon fontSize="small" />
    case 'margin':
      return <BarChartIcon fontSize="small" />
    default:
      return <AssessmentIcon fontSize="small" />
  }
}

export type KpiSummaryProps = {
  items: KpiItem[]
}

export default function KpiSummary({ items }: KpiSummaryProps): React.JSX.Element {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {items.map((kpi) => (
        <Grid
          key={kpi.key}
          size={{ xs: 12, md: kpi.key === 'inventory-value' ? 12 : 3 }}
        >
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
            elevation={3}
          >
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                {getIcon(kpi.type)}
                <Typography variant="caption" color="text.secondary">
                  {kpi.label}
                </Typography>
              </Stack>
            </Stack>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {kpi.value}
            </Typography>
            <Chip
              size="small"
              label={kpi.changeLabel}
              sx={{
                alignSelf: 'flex-start',
                mt: 0.5,
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: kpi.changeColor,
                color: kpi.changeColor
              }}
            />
            {kpi.key === 'profit-margin' && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress variant="determinate" value={24.3} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
