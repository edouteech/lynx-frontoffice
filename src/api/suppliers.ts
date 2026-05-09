import type { Paginated, Supplier } from '../types/api'
import { api } from './apiClient'

export async function fetchSuppliers(page = 1, q?: string): Promise<Paginated<Supplier>> {
  const params: Record<string, string | number> = { page }
  if (q) params.q = q
  const { data } = await api.get<Paginated<Supplier>>('/suppliers', { params })
  return data
}

export async function fetchSupplier(id: number | string): Promise<Supplier> {
  const { data } = await api.get<Supplier>(`/suppliers/${id}`)
  return data
}

export async function createSupplier(body: {
  name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_id?: string | null
  note?: string | null
}): Promise<Supplier> {
  const { data } = await api.post<Supplier>('/suppliers', body)
  return data
}

export async function updateSupplier(
  id: number | string,
  body: {
    name?: string
    contact_name?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    tax_id?: string | null
    note?: string | null
  }
): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}`, body)
  return data
}

export async function deleteSupplier(id: number | string): Promise<void> {
  await api.delete(`/suppliers/${id}`)
}
