import { api } from './apiClient'
import type { Paginated, Product, ProductStorePrice, ProductStockEntry, ProductComponent, ProductSupplement, ProductStoreSetting, Option } from '../types/api'

export interface CreateProductPayload extends Partial<Product> {
  store_stocks?: { store_id: number; quantity: number }[]
  store_prices?: { store_id: number; selling_price: number; tax_inclusive: boolean }[]
  components?: { child_product_id: number; quantity: number }[]
}

export interface FetchProductsParams {
  page?: number
  store_id?: number | null
  store_ids?: number[]
  category_id?: number | null
  stock_alert?: 'low' | 'out' | null
  only_trashed?: boolean
}

export async function fetchProducts(params: FetchProductsParams | number = 1): Promise<Paginated<Product>> {
  const p = typeof params === 'number' ? { page: params } : params
  const res = await api.get<Paginated<Product>>('/items', {
    params: {
      page: p.page ?? 1,
      ...(p.store_id    ? { store_id: p.store_id }       : {}),
      ...(p.store_ids?.length ? { store_ids: p.store_ids } : {}),
      ...(p.category_id ? { category_id: p.category_id } : {}),
      ...(p.stock_alert ? { stock_alert: p.stock_alert }  : {}),
      ...(p.only_trashed ? { only_trashed: true } : {}),
    }
  })
  return res.data
}

export async function restoreProduct(id: string | number): Promise<Product> {
  const res = await api.post<Product>(`/items/${id}/restore`)
  return res.data
}

export async function recalculateAllStock(): Promise<{ updated: number }> {
  const { data } = await api.post<{ updated: number }>('/items/recalculate-stock')
  return data
}

export async function fetchProductById(id: string | number): Promise<Product> {
  const res = await api.get<Product>(`/items/${id}`)
  return res.data
}

export async function createProduct(data: CreateProductPayload): Promise<Product> {
  const res = await api.post<Product>('/items', data)
  return res.data
}

export async function updateProduct(id: string | number, data: Partial<Product>): Promise<Product> {
  const res = await api.put<Product>(`/items/${id}`, data)
  return res.data
}

export async function deleteProduct(id: string | number): Promise<void> {
  await api.delete(`/items/${id}`)
}

export async function uploadProductImage(
  id: string | number,
  file: File
): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ image_url: string }>(`/items/${id}/upload-image`, form)
  return data.image_url
}


// ── Stock par magasin ──────────────────────────────────────────────────────
export async function fetchProductStock(itemId: string | number): Promise<ProductStockEntry[]> {
  const { data } = await api.get<ProductStockEntry[]>(`/items/${itemId}/stock`)
  return data
}

export async function upsertProductStock(
  itemId: string | number,
  storeId: number,
  quantity: number,
  minStockAlert?: number | null,
): Promise<void> {
  await api.post(`/items/${itemId}/stock`, {
    store_id: storeId,
    quantity,
    ...(minStockAlert !== undefined ? { min_stock_alert: minStockAlert } : {}),
  })
}

// ── Prix par magasin ───────────────────────────────────────────────────────
export async function fetchProductStorePrices(itemId: string | number): Promise<ProductStorePrice[]> {
  const { data } = await api.get<ProductStorePrice[]>(`/items/${itemId}/store-prices`)
  return data
}

export async function upsertProductStorePrice(
  itemId: string | number,
  storeId: number,
  sellingPrice: number,
  taxInclusive: boolean
): Promise<void> {
  await api.post(`/items/${itemId}/store-prices`, {
    store_id: storeId,
    selling_price: sellingPrice,
    tax_inclusive: taxInclusive,
  })
}

export async function resetProductStorePrice(itemId: string | number, storeId: number): Promise<void> {
  await api.delete(`/items/${itemId}/store-prices/${storeId}`)
}

// ── Paramètres par magasin (disponibilité + vente) ────────────────────────
export async function fetchProductStoreSettings(itemId: string | number): Promise<ProductStoreSetting[]> {
  const { data } = await api.get<ProductStoreSetting[]>(`/items/${itemId}/store-settings`)
  return data
}

export interface BulkSaveStoreEntry {
  store_id: number
  available: boolean
  for_sale: boolean
  selling_price: number
  tax_inclusive: boolean
  quantity?: number
  min_stock_alert?: number | null
}

export async function bulkSaveProductStores(
  itemId: string | number,
  stores: BulkSaveStoreEntry[],
): Promise<{ stock_quantity: number }> {
  const { data } = await api.post<{ stock_quantity: number }>(`/items/${itemId}/stores-bulk-save`, { stores })
  return data
}

// ── Composants ─────────────────────────────────────────────────────────────
export async function fetchProductComponents(itemId: string | number): Promise<ProductComponent[]> {
  const { data } = await api.get<ProductComponent[]>(`/items/${itemId}/components`)
  return data
}

export async function addProductComponent(
  itemId: string | number,
  childProductId: number,
  quantity: number
): Promise<ProductComponent> {
  const { data } = await api.post<ProductComponent>(`/items/${itemId}/components`, {
    child_product_id: childProductId,
    quantity,
  })
  return data
}

export async function removeProductComponent(
  itemId: string | number,
  componentId: number
): Promise<void> {
  await api.delete(`/items/${itemId}/components/${componentId}`)
}

// ── Suppléments ─────────────────────────────────────────────────────────────
export async function fetchProductSupplements(itemId: string | number): Promise<ProductSupplement[]> {
  const { data } = await api.get<ProductSupplement[]>(`/items/${itemId}/supplements`)
  return data
}

export async function addProductSupplement(
  itemId: string | number,
  supplementProductId: number,
  price: number
): Promise<ProductSupplement> {
  const { data } = await api.post<ProductSupplement>(`/items/${itemId}/supplements`, {
    supplement_product_id: supplementProductId,
    price,
  })
  return data
}

export async function updateProductSupplement(
  itemId: string | number,
  supplementId: number,
  price: number
): Promise<ProductSupplement> {
  const { data } = await api.put<ProductSupplement>(`/items/${itemId}/supplements/${supplementId}`, { price })
  return data
}

export async function removeProductSupplement(
  itemId: string | number,
  supplementId: number
): Promise<void> {
  await api.delete(`/items/${itemId}/supplements/${supplementId}`)
}

// ── Options ────────────────────────────────────────────────────────────────
export async function fetchProductOptions(itemId: string | number): Promise<Option[]> {
  const { data } = await api.get<Option[]>(`/items/${itemId}/options`)
  return data
}

export async function syncProductOptions(
  itemId: string | number,
  optionIds: number[]
): Promise<{ option_ids: number[] }> {
  const { data } = await api.post<{ option_ids: number[] }>(`/items/${itemId}/sync-options`, {
    option_ids: optionIds,
  })
  return data
}
