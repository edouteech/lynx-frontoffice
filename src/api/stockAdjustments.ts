import type { Paginated, StockAdjustment, StockAdjustmentItem } from '../types/api'
import { api } from './apiClient'

export async function fetchStockAdjustments(page = 1): Promise<Paginated<StockAdjustment>> {
  const { data } = await api.get<Paginated<StockAdjustment>>('/stock-adjustments', { params: { page } })
  return data
}

export async function fetchStockAdjustment(id: number | string): Promise<StockAdjustment> {
  const { data } = await api.get<StockAdjustment>(`/stock-adjustments/${id}`)
  return data
}

export interface CreateStockAdjustmentPayload {
  store_id: number
  adjustment_date?: string | null
  note?: string | null
  items?: { product_id: number; quantity_change: number }[]
}

export async function createStockAdjustment(body: CreateStockAdjustmentPayload): Promise<StockAdjustment> {
  const { data } = await api.post<StockAdjustment>('/stock-adjustments', body)
  return data
}

export async function updateStockAdjustment(
  id: number | string,
  body: Partial<Omit<CreateStockAdjustmentPayload, 'items'>>
): Promise<StockAdjustment> {
  const { data } = await api.patch<StockAdjustment>(`/stock-adjustments/${id}`, body)
  return data
}

export async function deleteStockAdjustment(id: number | string): Promise<void> {
  await api.delete(`/stock-adjustments/${id}`)
}

export async function addStockAdjustmentItem(
  adjustmentId: number | string,
  body: { product_id: number; quantity_change: number }
): Promise<StockAdjustmentItem> {
  const { data } = await api.post<StockAdjustmentItem>(`/stock-adjustments/${adjustmentId}/items`, body)
  return data
}

export async function updateStockAdjustmentItem(
  adjustmentId: number | string,
  itemId: number | string,
  body: { quantity_change: number }
): Promise<StockAdjustmentItem> {
  const { data } = await api.patch<StockAdjustmentItem>(`/stock-adjustments/${adjustmentId}/items/${itemId}`, body)
  return data
}

export async function removeStockAdjustmentItem(
  adjustmentId: number | string,
  itemId: number | string
): Promise<void> {
  await api.delete(`/stock-adjustments/${adjustmentId}/items/${itemId}`)
}

export async function applyStockAdjustment(id: number | string): Promise<StockAdjustment> {
  const { data } = await api.post<StockAdjustment>(`/stock-adjustments/${id}/apply`)
  return data
}
