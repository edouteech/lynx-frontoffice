import type { ItemCategory, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchItemCategories(
  page = 1
): Promise<Paginated<ItemCategory>> {
  const { data } = await api.get<Paginated<ItemCategory>>('/item-categories', {
    params: { page },
  })
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
