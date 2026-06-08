import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPath, canAccessRoute } from '../../lib/auth'
import LoadingSpinner from '../ui/LoadingSpinner'

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !canAccessRoute(user, roles)) {
    return <Navigate to={getDashboardPath(user?.role)} replace />
  }

  return children
}

export function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />
  }

  return children
}

export function DashboardRedirect() {
  const { user } = useAuth()
  return <Navigate to={getDashboardPath(user?.role)} replace />
}
