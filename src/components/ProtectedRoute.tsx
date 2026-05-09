import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { getToken } from '../lib/authStorage'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <LoadingScreen label="Vérification de la session…" />
  }

  if (!getToken() || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
