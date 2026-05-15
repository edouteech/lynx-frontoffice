import type { PurchaseOrderReception } from '../types/api'
import { api } from './apiClient'

export async function fetchReceptions(orderId: number | string): Promise<PurchaseOrderReception[]> {
  const { data } = await api.get<PurchaseOrderReception[]>(`/purchase-orders/${orderId}/receptions`)
  return data
}

export async function fetchReception(
  orderId: number | string,
  receptionId: number | string
): Promise<PurchaseOrderReception> {
  const { data } = await api.get<PurchaseOrderReception>(
    `/purchase-orders/${orderId}/receptions/${receptionId}`
  )
  return data
}

export async function createReception(
  orderId: number | string,
  body: FormData
): Promise<PurchaseOrderReception> {
  const { data } = await api.post<PurchaseOrderReception>(
    `/purchase-orders/${orderId}/receptions`,
    body
  )
  return data
}
