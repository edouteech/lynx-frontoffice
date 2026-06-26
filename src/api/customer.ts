import type { Customer, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchCustomers(
  page = 1,
  q?: string,
  only_trashed?: boolean
): Promise<Paginated<Customer>> {
  const params: Record<string, string | number | boolean> = { page }
  if (q) params.q = q
  if (only_trashed) params.only_trashed = true
  const { data } = await api.get<Paginated<Customer>>('/customers', { params })
  return data
}

export async function restoreCustomer(id: number | string): Promise<Customer> {
  const { data } = await api.post<Customer>(`/customers/${id}/restore`)
  return data
}

export async function createCustomer(body: {
  name: string
  email?: string | null
  phone?: string | null
  note?: string | null
  tax_id?: string | null
  discount_percentage?: number | null
  aib?: boolean
}): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers', {
    name: body.name,
    email: body.email,
    phone: body.phone,
    note: body.note,
    tax_id: body.tax_id,
    discount_percentage: body.discount_percentage,
    aib: body.aib,
  })
  return data
}

export async function updateCustomer(
  id: number | string,
  body: {
    name?: string
    email?: string | null
    phone?: string | null
    note?: string | null
    tax_id?: string | null
    discount_percentage?: number | null
    aib?: boolean
  }
): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${id}`, {
    name: body.name,
    email: body.email,
    phone: body.phone,
    note: body.note,
    tax_id: body.tax_id,
    discount_percentage: body.discount_percentage,
    aib: body.aib,
  })
  return data
}

export async function deleteCustomer(id: number | string): Promise<void> {
  await api.delete(`/customers/${id}`)
}

