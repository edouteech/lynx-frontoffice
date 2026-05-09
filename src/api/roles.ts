import type { Paginated, Role } from '../types/api'
import { api } from './apiClient'

export async function fetchRoles(page = 1): Promise<Paginated<Role>> {
  const { data } = await api.get<Paginated<Role>>('/roles', { params: { page } })
  return data
}

export async function fetchAllRoles(): Promise<Role[]> {
  const all: Role[] = []
  let page = 1
  while (true) {
    const res = await fetchRoles(page)
    all.push(...(res.data ?? []))
    if (page >= res.last_page) break
    page += 1
  }
  return all
}

export async function fetchRole(id: number | string): Promise<Role> {
  const { data } = await api.get<Role>(`/roles/${id}`)
  return data
}

export async function createRole(body: {
  name: string
  description?: string | null
  permission_ids?: number[]
}): Promise<Role> {
  const { data } = await api.post<Role>('/roles', body)
  return data
}

export async function updateRole(
  id: number | string,
  body: {
    name?: string
    description?: string | null
    permission_ids?: number[]
  }
): Promise<Role> {
  const { data } = await api.patch<Role>(`/roles/${id}`, body)
  return data
}

export async function deleteRole(id: number | string): Promise<void> {
  await api.delete(`/roles/${id}`)
}
