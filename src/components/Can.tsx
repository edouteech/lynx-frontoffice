import type { ReactNode } from 'react'
import { useAuth } from '../contexts/useAuth'
import { hasPermissionCode } from '../lib/permissions'

export default function Can({
  code,
  children,
  fallback = null,
}: {
  code: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { user, activeOrganizationId } = useAuth()

  if (!hasPermissionCode(user, activeOrganizationId, code)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
