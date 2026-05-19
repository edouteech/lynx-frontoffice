import type { ItemCategory, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchItemCategories(
  page = 1,
  only_trashed?: boolean
): Promise<Paginated<ItemCategory>> {
  const params: Record<string, string | number | boolean> = { page }
  if (only_trashed) params.only_trashed = true
  const { data } = await api.get<Paginated<ItemCategory>>('/item-categories', { params })
  return data
}

export async function restoreItemCategory(id: number | string): Promise<ItemCategory> {
  const { data } = await api.post<ItemCategory>(`/item-categories/${id}/restore`)
  return data
}

export async function createItemCategory(body: {
  name: string
  color?: string | null
}): Promise<ItemCategory> {
  const { data } = await api.post<ItemCategory>('/item-categories', body)
  return data
}

export async function updateItemCategory(
  id: number | string,
  body: { name?: string; color?: string | null }
): Promise<ItemCategory> {
  const { data } = await api.patch<ItemCategory>(`/item-categories/${id}`, body)
  return data
}

export async function deleteItemCategory(id: number | string): Promise<void> {
  await api.delete(`/item-categories/${id}`)
}
