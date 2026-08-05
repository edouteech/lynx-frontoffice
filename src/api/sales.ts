import type { Paginated, Sale, SaleItem } from '../types/api'
import { api } from './apiClient'

export interface FetchSalesParams {
  page?: number
  per_page?: number
  store_id?: number | null
  status?: string | null
  from?: string | null
  to?: string | null
  customer_id?: number | null
  channel?: 'web' | 'pos' | null
  type_facture?: 'FV' | 'FA' | 'RA' | null
  seller_name?: string | null
  search?: string | null
}

export interface SalesStats {
  count: number
  total_subtotal: number
  total_discount: number
}

export async function fetchSales(
  params: FetchSalesParams = {}
): Promise<Paginated<Sale> & { stats?: SalesStats }> {
  const p: Record<string, string | number> = { page: params.page ?? 1 }
  if (params.per_page) p.per_page = params.per_page
  if (params.store_id) p.store_id = params.store_id
  if (params.status) p.status = params.status
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  if (params.customer_id) p.customer_id = params.customer_id
  if (params.channel) p.channel = params.channel
  if (params.type_facture) p.type_facture = params.type_facture
  if (params.seller_name) p.seller_name = params.seller_name
  if (params.search) p.search = params.search
  const { data } = await api.get<Paginated<Sale> & { stats?: SalesStats }>('/sales', { params: p })
  return data
}

export async function fetchSale(id: number | string): Promise<Sale> {
  const { data } = await api.get<Sale>(`/sales/${id}`)
  return data
}

export interface CreateSaleItemPayload {
  product_id: number
  quantity: number
  unit_price: number
  unit_price_ht?: number | null
  description?: string | null
  discount?: number
  sold_by?: string | null
  product_category_id?: number | null
  product_vat_rate?: number | null
  product_tax_name?: string | null
}

export interface CreateSalePayload {
  store_id: number
  customer_id?: number | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_tax_id?: string | null
  customer_ifu?: string | null
  cash_register_id?: number | null
  cash_register_name?: string | null
  payment_method_id?: number | null
  payment_method_name?: string | null
  sale_date?: string | null
  note?: string | null
  order_type?: string | null
  invoice_number?: string | null
  last_invoice_number?: string | null
  server_id?: number | null
  server_name?: string | null
  cashier_name?: string | null
  type_facture?: string | null
  country?: string | null
  code_dgi?: string | null
  periode_w?: string | null
  discount_percentage?: number
  extra_fees?: number
  total?: number | null
  total_ht?: number | null
  paid_amount?: number | null
  change_amount?: number | null
  items?: CreateSaleItemPayload[]
}

export async function createSale(body: CreateSalePayload): Promise<Sale> {
  const { data } = await api.post<Sale>('/sales', body)
  return data
}

// Création multiple : envoie plusieurs ventes en une seule requête POST
export async function createSales(sales: CreateSalePayload[]): Promise<Sale[]> {
  const { data } = await api.post<{ sales: Sale[] }>('/sales', { sales })
  return data.sales
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
  body: { product_id: number; quantity: number; unit_price: number; description?: string | null }
): Promise<SaleItem> {
  const { data } = await api.post<SaleItem>(`/sales/${saleId}/items`, body)
  return data
}

export async function updateSaleItem(
  saleId: number | string,
  itemId: number | string,
  body: { quantity?: number; unit_price?: number; description?: string | null }
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
