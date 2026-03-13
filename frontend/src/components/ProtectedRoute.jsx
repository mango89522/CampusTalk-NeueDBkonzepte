import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ requireAdmin = false }) {
  const { isLoggedIn, isAdmin, isAuthReady } = useAuth()

  if (!isAuthReady) {
    return <div className="center-message">Lade Sitzung...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
