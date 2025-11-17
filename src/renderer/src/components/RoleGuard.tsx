import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export type RoleGuardProps = {
  requiredPermissions: string[]
}

export default function RoleGuard({ requiredPermissions }: RoleGuardProps): React.JSX.Element {
  const { isAuthenticated, hasPermission } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const allowed = requiredPermissions.length === 0 || hasPermission(requiredPermissions)
  if (!allowed) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
