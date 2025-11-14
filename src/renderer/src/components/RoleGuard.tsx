import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export type RoleGuardProps = {
  allowedRoles: string[]
}

export default function RoleGuard({ allowedRoles }: RoleGuardProps): React.JSX.Element {
  const { isAuthenticated, roles } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const hasRole = allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role))
  if (!hasRole) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
