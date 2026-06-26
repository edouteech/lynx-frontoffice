import type { Discount, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchDiscounts(page = 1, store_id?: number): Promise<Paginated<Discount>> {
  const params: Record<string, string | number> = { page }
  if (store_id) params.store_id = store_id
  const { data } = await api.get<Paginated<Discount>>('/discounts', { params })
  return data
}

export async function createDiscount(body: {
  store_ids: number[]
  name: string
  type: 'percentage' | 'amount' | 'variant'
  value: number
  requires_password?: boolean
}): Promise<Discount> {
  const { data } = await api.post<Discount>('/discounts', body)
  return data
}

export async function updateDiscount(
  id: number | string,
  body: {
    store_ids?: number[]
    name?: string
    type?: 'percentage' | 'amount' | 'variant'
    value?: number
    requires_password?: boolean
  }
): Promise<Discount> {
  const { data } = await api.patch<Discount>(`/discounts/${id}`, body)
  return data
}

export async function deleteDiscount(id: number | string): Promise<void> {
  await api.delete(`/discounts/${id}`)
}
