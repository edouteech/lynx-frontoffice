/** Extracts IANA identifier (e.g. `Africa/Porto-Novo`) from select value or legacy input. */
export function timezoneIana(stored: string): string {
  const t = stored.trim()
  if (!t) return ''
  const paren = t.indexOf(' (')
  if (paren >= 0) return t.slice(0, paren).trim()
  return t
}

/** Value sent to API: IANA or `null` when empty. */
export function timezoneForApi(stored: string): string | null {
  const iana = timezoneIana(stored)
  return iana || null
}
