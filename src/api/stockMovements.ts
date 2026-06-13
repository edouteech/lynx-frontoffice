import { api } from './apiClient'

export type MovementType = 'sale' | 'adjustment' | 'transfer_out' | 'transfer_in' | 'purchase' | 'inventory'

export interface StockMovement {
  date: string
  product_id: number
  product_name: string
  product_sku: string
  store_name: string
  store_id: number
  raison: string
  movement_type: MovementType
  quantity_change: number
  stock_store_snapshot: number | null
  stock_global_snapshot: number | null
  user_name: string
}

export interface StockMovementPaginated {
  data: StockMovement[]
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface FetchStockMovementsParams {
  page?: number
  product_id?: number | null
  store_id?: number | null
  from_date?: string | null
  to_date?: string | null
}

export async function fetchStockMovements(
  params: FetchStockMovementsParams = {}
): Promise<StockMovementPaginated> {
  const { data } = await api.get<StockMovementPaginated>('/stock-movements', {
    params: {
      page: params.page ?? 1,
      ...(params.product_id ? { product_id: params.product_id } : {}),
      ...(params.store_id   ? { store_id:   params.store_id }   : {}),
      ...(params.from_date  ? { from_date:  params.from_date }  : {}),
      ...(params.to_date    ? { to_date:    params.to_date }    : {}),
    },
  })
  return data
}
