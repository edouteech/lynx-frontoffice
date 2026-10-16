import type { ReactNode } from 'react'
import { useAuth } from '../contexts/useAuth'
import { hasPermissionCode, isOwner } from '../lib/permissions'

export default function Can({
  code,
  ownerOnly,
  children,
  fallback = null,
}: {
  code?: string
  ownerOnly?: boolean
  children: ReactNode
  fallback?: ReactNode
}) {
  const { user, activeOrganizationId } = useAuth()

  if (ownerOnly && !isOwner(user, activeOrganizationId)) {
    return <>{fallback}</>
  }

  if (code && !hasPermissionCode(user, activeOrganizationId, code)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function OwnerOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return <Can ownerOnly fallback={fallback}>{children}</Can>
}

export function useIsOwner(): boolean {
  const { user, activeOrganizationId } = useAuth()
  return isOwner(user, activeOrganizationId)
}

