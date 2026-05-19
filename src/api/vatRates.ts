import type { Paginated, VatRate } from '../types/api'
import { api } from './apiClient'

export async function fetchVatRates(
  page = 1,
  only_trashed?: boolean
): Promise<Paginated<VatRate>> {
  const params: Record<string, string | number | boolean> = { page }
  if (only_trashed) params.only_trashed = true
  const { data } = await api.get<Paginated<VatRate>>('/vat-rates', { params })
  return data
}

export async function restoreVatRate(id: number | string): Promise<VatRate> {
  const { data } = await api.post<VatRate>(`/vat-rates/${id}/restore`)
  return data
}

export async function createVatRate(body: {
  organization_id?: number | null
  name: string
  rate: number | string
}): Promise<VatRate> {
  const { data } = await api.post<VatRate>('/vat-rates', body)
  return data
}

export async function updateVatRate(
  id: number | string,
  body: { name?: string; rate?: number | string }
): Promise<VatRate> {
  const { data } = await api.patch<VatRate>(`/vat-rates/${id}`, body)
  return data
}

export async function deleteVatRate(id: number | string): Promise<void> {
  await api.delete(`/vat-rates/${id}`)
}

