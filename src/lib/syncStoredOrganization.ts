import type { User } from '../types/api'
import {
  clearStoredOrganizationId,
  getStoredOrganizationId,
  setStoredOrganizationId,
} from './organizationStorage'

/**
 * Aligns the stored organization ID with memberships available for the user.
 */
export function syncStoredOrganizationIdWithUser(user: User | null): number | null {
  if (!user?.organization_memberships?.length) {
    clearStoredOrganizationId()
    return null
  }
  const ids = user.organization_memberships.map((m) => m.organization_id)
  const stored = getStoredOrganizationId()
  const next =
    stored != null && ids.includes(stored) ? stored : ids[0]!
  setStoredOrganizationId(next)
  return next
}
