import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function Forbidden(): React.JSX.Element {
  const navigation = useNavigate()

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Access denied
      </Typography>
      <Typography variant="body1">You do not have permission to view this page.</Typography>
      <Button onClick={() => navigation(-1)}>Back</Button>
    </Box>
  )
}
