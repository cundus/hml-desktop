import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import useAuth from '../hooks/useAuth'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Masukkan email atau nama pengguna'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login(): React.JSX.Element {
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' }
  })

  const onSubmit = handleSubmit(async (values: LoginFormValues): Promise<void> => {
    await login(values)
  })

  return (
    <Box
      component="main"
      sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Paper elevation={6} square sx={{ p: 4, width: '100%', maxWidth: 360, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
        </Box>
        <Box component="form" noValidate onSubmit={onSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="identifier"
            label="Email atau Nama Pengguna"
            autoComplete="email"
            autoFocus
            {...register('identifier')}
            error={!!errors.identifier}
            helperText={errors.identifier?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
