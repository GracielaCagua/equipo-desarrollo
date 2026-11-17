import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (user.role === 'editor' && location.pathname !== '/usuario') {
    return <Navigate to="/usuario" replace />
  }

  return <Outlet />
}
