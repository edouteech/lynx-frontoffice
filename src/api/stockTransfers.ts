import type { Paginated, StockTransfer, StockTransferItem } from '../types/api'
import { api } from './apiClient'

export async function fetchStockTransfers(page = 1): Promise<Paginated<StockTransfer>> {
  const { data } = await api.get<Paginated<StockTransfer>>('/stock-transfers', { params: { page } })
  return data
}

export async function fetchStockTransfer(id: number | string): Promise<StockTransfer> {
  const { data } = await api.get<StockTransfer>(`/stock-transfers/${id}`)
  return data
}

export interface CreateStockTransferPayload {
  from_store_id: number
  to_store_id: number
  transfer_date?: string | null
  note?: string | null
  items?: { product_id: number; quantity: number }[]
}

export async function createStockTransfer(body: CreateStockTransferPayload): Promise<StockTransfer> {
  const { data } = await api.post<StockTransfer>('/stock-transfers', body)
  return data
}

export async function updateStockTransfer(
  id: number | string,
  body: Partial<Omit<CreateStockTransferPayload, 'items'>>
): Promise<StockTransfer> {
  const { data } = await api.patch<StockTransfer>(`/stock-transfers/${id}`, body)
  return data
}

export async function deleteStockTransfer(id: number | string): Promise<void> {
  await api.delete(`/stock-transfers/${id}`)
}

export async function addStockTransferItem(
  transferId: number | string,
  body: { product_id: number; quantity: number }
): Promise<StockTransferItem> {
  const { data } = await api.post<StockTransferItem>(`/stock-transfers/${transferId}/items`, body)
  return data
}

export async function updateStockTransferItem(
  transferId: number | string,
  itemId: number | string,
  body: { quantity: number }
): Promise<StockTransferItem> {
  const { data } = await api.patch<StockTransferItem>(`/stock-transfers/${transferId}/items/${itemId}`, body)
  return data
}

export async function removeStockTransferItem(
  transferId: number | string,
  itemId: number | string
): Promise<void> {
  await api.delete(`/stock-transfers/${transferId}/items/${itemId}`)
}

export async function confirmStockTransfer(id: number | string): Promise<StockTransfer> {
  const { data } = await api.post<StockTransfer>(`/stock-transfers/${id}/confirm`)
  return data
}
