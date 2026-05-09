import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { hasPermissionCode } from '../lib/permissions'

export default function RequirePermission({
  code,
  children,
}: {
  code: string
  children: ReactNode
}) {
  const { user, activeOrganizationId, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) return null

  if (!hasPermissionCode(user, activeOrganizationId, code)) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

