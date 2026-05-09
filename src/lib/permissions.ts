import { isOwnerRoleName } from './ownerRole'
import type { User } from '../types/api'

export function hasPermissionCode(
  user: User | null | undefined,
  activeOrganizationId: number | null | undefined,
  code: string
): boolean {
  if (!user || activeOrganizationId == null) return false
  const m = user.organization_memberships?.find(
    (x) => x.organization_id === activeOrganizationId
  )
  const roleName = m?.role?.name ?? ''
  if (isOwnerRoleName(roleName)) return true
  const perms = m?.role?.permissions ?? []
  return perms.some((p) => p.code === code)
}

