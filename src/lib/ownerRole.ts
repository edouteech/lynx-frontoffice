/** Aligned with `App\Models\Role::OWNER_ROLE_NAME`. */
const OWNER_ROLE_NAME = 'Owner'

export function isOwnerRoleName(name: string): boolean {
  return name.trim().toLowerCase() === OWNER_ROLE_NAME.toLowerCase()
}

export function isOwnerRole(role: { name: string }): boolean {
  return isOwnerRoleName(role.name)
}

export function displayRoleName(name: string | null | undefined): string {
  const raw = (name ?? '').trim()
  if (!raw) return ''
  return isOwnerRoleName(raw) ? 'Propriétaire' : raw
}
