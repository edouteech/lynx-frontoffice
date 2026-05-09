import type { Role, User, UserOrganizationMembership } from '../types/api'

/** Membership for current organization context. */
export function scopedOrganizationMembership(
  u: User | null | undefined,
  activeOrganizationId?: number | null
): UserOrganizationMembership | undefined {
  const memberships = u?.organization_memberships ?? []
  if (!memberships.length) return undefined
  if (activeOrganizationId == null) return memberships[0]
  return memberships.find((m) => m.organization_id === activeOrganizationId) ?? memberships[0]
}

export function scopedRoleId(
  u: User | null | undefined,
  activeOrganizationId?: number | null
): number | null {
  const m = scopedOrganizationMembership(u, activeOrganizationId)
  return m?.role_id ?? null
}

export function scopedRole(
  u: User | null | undefined,
  activeOrganizationId?: number | null
): Role | null | undefined {
  return scopedOrganizationMembership(u, activeOrganizationId)?.role ?? null
}
