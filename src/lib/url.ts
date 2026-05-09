import { API_BASE_URL } from '../config/env'

export function resolveBackendUrl(maybeUrl: string | null | undefined): string | null {
  if (!maybeUrl) return null
  const u = String(maybeUrl).trim()
  if (!u) return null
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) return `${API_BASE_URL}${u}`
  return `${API_BASE_URL}/${u}`
}

