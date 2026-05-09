import type { Paginated, Store } from '../types/api'
import { api } from './apiClient'

export async function fetchStores(
  page = 1,
  statusFilter?: string
): Promise<Paginated<Store>> {
  const params: Record<string, string | number> = { page }
  if (statusFilter) params.status = statusFilter
  const { data } = await api.get<Paginated<Store>>('/stores', { params })
  return data
}

export async function fetchStore(id: number | string): Promise<Store> {
  const { data } = await api.get<Store>(`/stores/${id}`)
  return data
}

export async function createStore(body: {
  name: string
  address?: string | null
  phone?: string | null
  token?: string | null
  is_purchasing_center?: boolean
  status?: string
}): Promise<Store> {
  const { data } = await api.post<Store>('/stores', body)
  return data
}

export async function updateStore(
  id: number | string,
  body: {
    name?: string
    address?: string | null
    phone?: string | null
    token?: string | null
    is_purchasing_center?: boolean
    status?: string
  }
): Promise<Store> {
  const { data } = await api.patch<Store>(`/stores/${id}`, body)
  return data
}

export async function deleteStore(id: number | string): Promise<void> {
  await api.delete(`/stores/${id}`)
}
