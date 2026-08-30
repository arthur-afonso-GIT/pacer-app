import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { authCopy } from './copy'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p role="status">{authCopy.loading}</p>
  if (!user) return <Navigate to="/entrar" replace state={{ from: location }} />
  return <Outlet />
}
