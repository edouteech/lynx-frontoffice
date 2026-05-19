import { api } from './apiClient'
import type { Paginated, RestaurantOption } from '../types/api'

export async function fetchRestaurantOptions(
  page = 1
): Promise<Paginated<RestaurantOption>> {
  const { data } = await api.get<Paginated<RestaurantOption>>('/restaurant-options', {
    params: { page },
  })
  return data
}

export async function fetchRestaurantOption(id: number | string): Promise<RestaurantOption> {
  const { data } = await api.get<RestaurantOption>(`/restaurant-options/${id}`)
  return data
}

export async function createRestaurantOption(body: {
  name: string
  description?: string | null
  status?: 'active' | 'inactive'
  store_ids?: number[]
}): Promise<RestaurantOption> {
  const { data } = await api.post<RestaurantOption>('/restaurant-options', body)
  return data
}

export async function updateRestaurantOption(
  id: number | string,
  body: {
    name?: string
    description?: string | null
    status?: 'active' | 'inactive'
    store_ids?: number[]
  }
): Promise<RestaurantOption> {
  const { data } = await api.patch<RestaurantOption>(`/restaurant-options/${id}`, body)
  return data
}

export async function deleteRestaurantOption(id: number | string): Promise<void> {
  await api.delete(`/restaurant-options/${id}`)
}
