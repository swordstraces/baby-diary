import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { me, loading, error } = useAuth()
  const location = useLocation()
  const token = getToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (loading) {
    return (
      <div className="page center">
        <p className="muted">加载中…</p>
      </div>
    )
  }

  if (!me || error) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
