import type { Paginated, PurchaseOrder, PurchaseOrderItem, Store } from '../types/api'
import { api } from './apiClient'

export async function fetchPurchaseOrders(
  page = 1,
  type?: 'central' | 'supplier'
): Promise<Paginated<PurchaseOrder>> {
  const { data } = await api.get<Paginated<PurchaseOrder>>('/purchase-orders', {
    params: { page, ...(type ? { type } : {}) },
  })
  return data
}

export async function fetchPurchaseOrder(id: number | string): Promise<PurchaseOrder> {
  const { data } = await api.get<PurchaseOrder>(`/purchase-orders/${id}`)
  return data
}

export async function fetchPurchasingCenters(): Promise<Store[]> {
  const { data } = await api.get<Store[]>('/purchasing-centers')
  return data
}

export interface CreatePurchaseOrderPayload {
  supplier_id?: number | null
  purchasing_center_id?: number | null
  store_id: number
  order_date?: string | null
  expected_date?: string | null
  note?: string | null
  discount_percentage?: number
  extra_fees?: number
  action?: 'draft' | 'submit'
  items?: { product_id: number; quantity: number; unit_cost: number }[]
}

export async function createPurchaseOrder(body: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>('/purchase-orders', body)
  return data
}

export async function updatePurchaseOrder(
  id: number | string,
  body: Partial<CreatePurchaseOrderPayload>
): Promise<PurchaseOrder> {
  const { data } = await api.patch<PurchaseOrder>(`/purchase-orders/${id}`, body)
  return data
}

export async function deletePurchaseOrder(id: number | string): Promise<void> {
  await api.delete(`/purchase-orders/${id}`)
}

export async function addPurchaseOrderItem(
  orderId: number | string,
  body: { product_id: number; quantity: number; unit_cost: number }
): Promise<PurchaseOrderItem> {
  const { data } = await api.post<PurchaseOrderItem>(`/purchase-orders/${orderId}/items`, body)
  return data
}

export async function updatePurchaseOrderItem(
  orderId: number | string,
  itemId: number | string,
  body: { quantity?: number; unit_cost?: number }
): Promise<PurchaseOrderItem> {
  const { data } = await api.patch<PurchaseOrderItem>(`/purchase-orders/${orderId}/items/${itemId}`, body)
  return data
}

export async function removePurchaseOrderItem(
  orderId: number | string,
  itemId: number | string
): Promise<void> {
  await api.delete(`/purchase-orders/${orderId}/items/${itemId}`)
}

export async function receivePurchaseOrder(
  id: number | string,
  items: { item_id: number; quantity_received: number }[]
): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items })
  return data
}

export async function submitPurchaseOrder(id: number | string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/submit`)
  return data
}

export async function confirmPurchaseOrder(id: number | string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/confirm`)
  return data
}

export async function validatePurchaseOrder(id: number | string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/validate`)
  return data
}

export async function markPurchaseOrderCompleted(id: number | string): Promise<PurchaseOrder> {
  const { data } = await api.post<PurchaseOrder>(`/purchase-orders/${id}/complete`)
  return data
}
