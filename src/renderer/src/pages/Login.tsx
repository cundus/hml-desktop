import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import StorefrontIcon from '@mui/icons-material/Storefront'
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
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [branchName, setBranchName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' }
  })

  useEffect(() => {
    const checkSetup = async (): Promise<void> => {
      try {
        const configRes = await window.api.db.appConfig.isConfigured()
        if (!configRes.success || !configRes.data) {
          // Not configured, redirect to setup
          navigate('/setup')
          return
        }
        // Get branch name for display
        const deviceConfig = await window.api.db.appConfig.get()
        if (deviceConfig.success && deviceConfig.data) {
          setBranchName(deviceConfig.data.branchName)
        }
      } catch (err) {
        console.error('Failed to check setup:', err)
      } finally {
        setCheckingSetup(false)
      }
    }
    checkSetup()
  }, [navigate])

  const onSubmit = handleSubmit(async (values: LoginFormValues): Promise<void> => {
    try {
      setError(null)
      await login(values)
    } catch (err) {
      setError((err as Error).message || 'Login gagal')
    }
  })

  if (checkingSetup) {
    return (
      <Box
        component="main"
        sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Box>
    )
  }

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
          {branchName && (
            <Chip
              icon={<StorefrontIcon />}
              label={branchName}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Box component="form" noValidate onSubmit={onSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
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
