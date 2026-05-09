import type { Favorite, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchFavorites(
  page = 1,
  q?: string,
  status?: 'active' | 'inactive',
  storeId?: number | string
): Promise<Paginated<Favorite>> {
  const params: Record<string, string | number> = { page }
  if (q?.trim()) params.q = q.trim()
  if (status) params.status = status
  if (storeId != null && String(storeId) !== '') params.store_id = Number(storeId)
  const { data } = await api.get<Paginated<Favorite>>('/favorites', { params })
  return data
}

export async function fetchFavorite(id: number | string): Promise<Favorite> {
  const { data } = await api.get<Favorite>(`/favorites/${id}`)
  return data
}

export async function createFavorite(body: {
  name: string
  status?: 'active' | 'inactive'
  store_ids?: number[]
  product_ids?: number[]
}): Promise<Favorite> {
  const { data } = await api.post<Favorite>('/favorites', body)
  return data
}

export async function updateFavorite(
  id: number | string,
  body: {
    name?: string
    status?: 'active' | 'inactive'
    store_ids?: number[]
    product_ids?: number[]
  }
): Promise<Favorite> {
  const { data } = await api.patch<Favorite>(`/favorites/${id}`, body)
  return data
}

export async function deleteFavorite(id: number | string): Promise<void> {
  await api.delete(`/favorites/${id}`)
}

