import type { Paginated, PaymentMethodCategory } from '../types/api'
import { api } from './apiClient'

export async function fetchPaymentMethodCategories(
  page = 1
): Promise<Paginated<PaymentMethodCategory>> {
  const params: Record<string, string | number> = { page }
  const { data } = await api.get<Paginated<PaymentMethodCategory>>(
    '/payment-method-categories',
    { params }
  )
  return data
}

export async function fetchPaymentMethodCategory(
  id: number | string
): Promise<PaymentMethodCategory> {
  const { data } = await api.get<PaymentMethodCategory>(
    `/payment-method-categories/${id}`
  )
  return data
}

export async function createPaymentMethodCategory(body: {
  name: string
  is_available?: boolean
}): Promise<PaymentMethodCategory> {
  const { data } = await api.post<PaymentMethodCategory>(
    '/payment-method-categories',
    body
  )
  return data
}

export async function updatePaymentMethodCategory(
  id: number | string,
  body: {
    name?: string
    is_available?: boolean
  }
): Promise<PaymentMethodCategory> {
  const { data } = await api.patch<PaymentMethodCategory>(
    `/payment-method-categories/${id}`,
    body
  )
  return data
}

export async function deletePaymentMethodCategory(id: number | string): Promise<void> {
  await api.delete(`/payment-method-categories/${id}`)
}

