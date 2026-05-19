import type { Paginated, PaymentMethod } from '../types/api'
import { api } from './apiClient'

export async function fetchPaymentMethods(
  page = 1,
  only_trashed?: boolean
): Promise<Paginated<PaymentMethod>> {
  const params: Record<string, string | number | boolean> = { page }
  if (only_trashed) params.only_trashed = true
  const { data } = await api.get<Paginated<PaymentMethod>>('/payment-methods', {
    params,
  })
  return data
}

export async function restorePaymentMethod(id: number | string): Promise<PaymentMethod> {
  const { data } = await api.post<PaymentMethod>(`/payment-methods/${id}/restore`)
  return data
}

export async function fetchPaymentMethod(
  id: number | string
): Promise<PaymentMethod> {
  const { data } = await api.get<PaymentMethod>(`/payment-methods/${id}`)
  return data
}

export async function createPaymentMethod(body: {
  name: string
  account_number?: string | null
  token?: string | null
  payment_method_category_id: number
  store_ids?: number[]
}): Promise<PaymentMethod> {
  const { data } = await api.post<PaymentMethod>('/payment-methods', body)
  return data
}

export async function updatePaymentMethod(
  id: number | string,
  body: {
    name?: string
    account_number?: string | null
    token?: string | null
    payment_method_category_id?: number
    store_ids?: number[]
  }
): Promise<PaymentMethod> {
  const { data } = await api.patch<PaymentMethod>(`/payment-methods/${id}`, body)
  return data
}

export async function deletePaymentMethod(id: number | string): Promise<void> {
  await api.delete(`/payment-methods/${id}`)
}

export async function fetchStorePaymentMethods(
  storeId: number | string
): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>(`/stores/${storeId}/payment-methods`)
  return data
}

