import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export default function RequireAuth(): React.JSX.Element {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()
  if (!isReady) {
    // Optionally render a splash/loading state while auth is hydrating from storage
    return <div />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
