import { api } from './apiClient'
import type { Paginated, KitchenPrinter, ItemCategory } from '../types/api'

export async function fetchKitchenPrinters(
  page = 1
): Promise<Paginated<KitchenPrinter>> {
  const { data } = await api.get<Paginated<KitchenPrinter>>('/kitchen-printers', {
    params: { page },
  })
  return data
}

export async function fetchKitchenPrinter(id: number | string): Promise<KitchenPrinter> {
  const { data } = await api.get<KitchenPrinter>(`/kitchen-printers/${id}`)
  return data
}

export async function createKitchenPrinter(body: {
  name: string
  status?: 'active' | 'inactive'
  category_ids?: number[]
}): Promise<KitchenPrinter> {
  const { data } = await api.post<KitchenPrinter>('/kitchen-printers', body)
  return data
}

export async function updateKitchenPrinter(
  id: number | string,
  body: {
    name?: string
    status?: 'active' | 'inactive'
    category_ids?: number[]
  }
): Promise<KitchenPrinter> {
  const { data } = await api.patch<KitchenPrinter>(`/kitchen-printers/${id}`, body)
  return data
}

export async function deleteKitchenPrinter(id: number | string): Promise<void> {
  await api.delete(`/kitchen-printers/${id}`)
}

export async function fetchAvailableCategories(
  excludePrinterId?: number | string
): Promise<Array<Pick<ItemCategory, 'id' | 'name' | 'color'>>> {
  const { data } = await api.get<Array<Pick<ItemCategory, 'id' | 'name' | 'color'>>>(
    '/kitchen-printers/available-categories',
    {
      params: excludePrinterId ? { exclude_printer_id: excludePrinterId } : undefined,
    }
  )
  return data
}
