import { api } from './apiClient'
import type { Inventory, InventoryItem, Paginated } from '../types/api'

export interface CreateInventoryPayload {
  store_id: number
  type: 'full' | 'partial'
  note?: string | null
  product_ids?: number[]
}

export async function fetchInventories(page = 1): Promise<Paginated<Inventory>> {
  const { data } = await api.get<Paginated<Inventory>>('/inventories', { params: { page } })
  return data
}

export async function fetchInventoryById(id: number | string): Promise<Inventory> {
  const { data } = await api.get<Inventory>(`/inventories/${id}`)
  return data
}

export async function createInventory(payload: CreateInventoryPayload): Promise<Inventory> {
  const { data } = await api.post<Inventory>('/inventories', payload)
  return data
}

export async function updateInventoryItem(
  inventoryId: number | string,
  itemId: number,
  actualQuantity: number | null
): Promise<InventoryItem> {
  const { data } = await api.patch<InventoryItem>(
    `/inventories/${inventoryId}/items/${itemId}`,
    { actual_quantity: actualQuantity }
  )
  return data
}

export async function applyInventory(id: number | string): Promise<Inventory> {
  const { data } = await api.post<Inventory>(`/inventories/${id}/apply`)
  return data
}

export async function deleteInventory(id: number | string): Promise<void> {
  await api.delete(`/inventories/${id}`)
}

export async function uploadInventoryFile(
  id: number | string,
  file: File
): Promise<{ file_path: string; file_name: string }> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ file_path: string; file_name: string }>(
    `/inventories/${id}/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}
