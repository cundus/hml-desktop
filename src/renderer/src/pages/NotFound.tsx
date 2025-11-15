import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

function NotFound(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <Box>
      <Typography variant="h4">404 Not Found</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>
        Back to Home
      </Button>
    </Box>
  )
}

export default NotFound
