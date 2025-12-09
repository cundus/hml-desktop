import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useBranchConfig from '../hooks/useBranchConfig'

export default function RequireAuth(): React.JSX.Element {
  const { isAuthenticated, isReady } = useAuth()
  const { config, loading: configLoading } = useBranchConfig()
  const location = useLocation()

  // Wait for both auth and config to be ready
  if (!isReady || configLoading) {
    return <div />
  }

  // Check if app is configured first
  if (!config?.isConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
