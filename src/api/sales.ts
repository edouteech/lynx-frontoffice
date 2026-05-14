import type { Paginated, Sale, SaleItem } from '../types/api'
import { api } from './apiClient'

export interface FetchSalesParams {
  page?: number
  store_id?: number | null
  status?: string | null
  from?: string | null
  to?: string | null
}

export async function fetchSales(params: FetchSalesParams = {}): Promise<Paginated<Sale>> {
  const p: Record<string, string | number> = { page: params.page ?? 1 }
  if (params.store_id) p.store_id = params.store_id
  if (params.status) p.status = params.status
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  const { data } = await api.get<Paginated<Sale>>('/sales', { params: p })
  return data
}

export async function fetchSale(id: number | string): Promise<Sale> {
  const { data } = await api.get<Sale>(`/sales/${id}`)
  return data
}

export interface CreateSalePayload {
  store_id: number
  customer_id?: number | null
  cash_register_id?: number | null
  payment_method_id?: number | null
  sale_date?: string | null
  note?: string | null
  discount_percentage?: number
  extra_fees?: number
  items?: { product_id: number; quantity: number; unit_price: number }[]
}

export async function createSale(body: CreateSalePayload): Promise<Sale> {
  const { data } = await api.post<Sale>('/sales', body)
  return data
}

export async function updateSale(
  id: number | string,
  body: Partial<Omit<CreateSalePayload, 'items'>>
): Promise<Sale> {
  const { data } = await api.patch<Sale>(`/sales/${id}`, body)
  return data
}

export async function deleteSale(id: number | string): Promise<void> {
  await api.delete(`/sales/${id}`)
}

export async function addSaleItem(
  saleId: number | string,
  body: { product_id: number; quantity: number; unit_price: number }
): Promise<SaleItem> {
  const { data } = await api.post<SaleItem>(`/sales/${saleId}/items`, body)
  return data
}

export async function updateSaleItem(
  saleId: number | string,
  itemId: number | string,
  body: { quantity?: number; unit_price?: number }
): Promise<SaleItem> {
  const { data } = await api.patch<SaleItem>(`/sales/${saleId}/items/${itemId}`, body)
  return data
}

export async function removeSaleItem(
  saleId: number | string,
  itemId: number | string
): Promise<void> {
  await api.delete(`/sales/${saleId}/items/${itemId}`)
}

export async function confirmSale(id: number | string): Promise<Sale> {
  const { data } = await api.post<Sale>(`/sales/${id}/confirm`)
  return data
}
