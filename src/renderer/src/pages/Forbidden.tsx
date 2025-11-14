import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

export default function Forbidden(): React.JSX.Element {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Access denied
      </Typography>
      <Typography variant="body1">You do not have permission to view this page.</Typography>
    </Box>
  )
}
