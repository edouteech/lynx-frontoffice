import axios from 'axios'

export function getApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (!axios.isAxiosError(err)) return fallback
  const data = err.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }
  if (typeof data?.message === 'string') return data.message
  if (err.response?.status === 422) return 'Données invalides.'
  return fallback
}
