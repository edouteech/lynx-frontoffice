import type { Paginated, Permission } from '../types/api'
import { api } from './apiClient'

export async function fetchPermissionsPage(
  page = 1
): Promise<Paginated<Permission>> {
  const { data } = await api.get<Paginated<Permission>>('/permissions', {
    params: { page },
  })
  return data
}

/** Charge toutes les pages (catalogue complet pour les formulaires rôle). */
export async function fetchAllPermissions(): Promise<Permission[]> {
  const all: Permission[] = []
  let page = 1
  while (true) {
    const res = await fetchPermissionsPage(page)
    all.push(...(res.data ?? []))
    if (page >= res.last_page) break
    page += 1
  }
  return all
}
