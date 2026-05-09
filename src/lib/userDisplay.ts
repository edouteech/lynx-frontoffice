import type { User } from '../types/api'

/** Display helpers based on API model (`name` + `email`). */
export function userDisplayName(user: Pick<User, 'name' | 'email'> | null): string {
  if (!user) return 'User'
  const n = user.name?.trim()
  if (n) return n
  return user.email
}

export function userInitials(user: Pick<User, 'name' | 'email'> | null): string {
  if (!user) return 'U'
  const n = user.name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return user.email?.charAt(0).toUpperCase() ?? 'U'
}
