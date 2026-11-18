import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { hasPermissionCode, getDefaultLandingPage } from '../lib/permissions'

export default function RequirePermission({
  code,
  children,
}: {
  /** Un code, ou une liste de codes dont UN SEUL suffit. */
  code: string | string[]
  children: ReactNode
}) {
  const { user, activeOrganizationId, bootstrapping } = useAuth()
  const location = useLocation()

  if (bootstrapping) return null

  const codes = Array.isArray(code) ? code : [code]
  if (!codes.some((c) => hasPermissionCode(user, activeOrganizationId, c))) {
    return (
      <Navigate
        to={getDefaultLandingPage(user, activeOrganizationId)}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <>{children}</>
}

