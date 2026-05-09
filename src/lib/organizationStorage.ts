const KEY = 'lynx_active_organization_id'

export function getStoredOrganizationId(): number | null {
  const v = localStorage.getItem(KEY)
  if (v == null || v === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export function setStoredOrganizationId(id: number): void {
  localStorage.setItem(KEY, String(id))
}

export function clearStoredOrganizationId(): void {
  localStorage.removeItem(KEY)
}
