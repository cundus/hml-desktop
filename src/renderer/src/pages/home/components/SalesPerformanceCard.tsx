import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material'

export default function SalesPerformanceCard(): React.JSX.Element {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        flex: 1,
        minHeight: 260,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column'
      }}
      elevation={3}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Sales Performance (Last 30 Days)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Compared to previous 30 days
          </Typography>
        </Box>
        <Chip size="small" label="+9.4% vs previous" color="success" variant="outlined" />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          bgcolor: 'background.default',
          border: '1px dashed',
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: 13
        }}
      >
        Sales chart placeholder (connect to real analytics later)
      </Box>
    </Paper>
  )
}
