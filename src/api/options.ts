import type { Option, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchOptions(
  page = 1,
  q?: string,
  status?: 'active' | 'inactive',
  productId?: number | string
): Promise<Paginated<Option>> {
  const params: Record<string, string | number> = { page }
  if (q?.trim()) params.q = q.trim()
  if (status) params.status = status
  if (productId != null && String(productId) !== '') params.product_id = Number(productId)
  const { data } = await api.get<Paginated<Option>>('/options', { params })
  return data
}

export async function fetchOption(id: number | string): Promise<Option> {
  const { data } = await api.get<Option>(`/options/${id}`)
  return data
}

export async function createOption(body: {
  name: string
  status?: 'active' | 'inactive'
  product_ids?: number[]
}): Promise<Option> {
  const { data } = await api.post<Option>('/options', body)
  return data
}

export async function updateOption(
  id: number | string,
  body: {
    name?: string
    status?: 'active' | 'inactive'
    product_ids?: number[]
  }
): Promise<Option> {
  const { data } = await api.patch<Option>(`/options/${id}`, body)
  return data
}

export async function deleteOption(id: number | string): Promise<void> {
  await api.delete(`/options/${id}`)
}
