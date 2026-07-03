import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByStore {
  store_id: number;
  store_name: string;
  total_transactions: number;
  total_items_sold: number;
  revenue_ht: number;
  revenue_ttc: number;
  revenue_net: number; // Keep for backward compatibility
  total_discount: number;
  total_cost: number;
  total_cost_ht: number;
  total_cost_ttc: number;
  profit: number;
  profit_ht: number;
  profit_ttc: number;
  profit_margin_pct: number;
  commission_rate: number;
  commission_amount: number;
}

export interface SalesByStoreResponse {
  success: boolean;
  data: SalesByStore[];
}

export interface SalesByStoreParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  seller_name?: string;
  category_id?: number;
}

/* ================= TREND ================= */

export interface SalesStoreTrend {
  date: string;
  store_id: number;
  store_name: string;
  revenue_ht: number;
  revenue_net: number;
}

export interface SalesStoreTrendResponse {
  success: boolean;
  data: SalesStoreTrend[];
}

export interface SalesStoreTrendParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  category_id?: number;
}

/* ================= API ================= */

export async function fetchSalesByStore(
  params?: SalesByStoreParams,
): Promise<SalesByStoreResponse> {
  const { data } = await api.get<SalesByStoreResponse>(
    "/reports/sales-by-store",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
        seller_name: params?.seller_name,
        category_id: params?.category_id,
      },
    },
  );
  return data;
}

export async function fetchSalesStoreTrend(
  params?: SalesStoreTrendParams,
): Promise<SalesStoreTrendResponse> {
  const { data } = await api.get<SalesStoreTrendResponse>(
    "/reports/sales-store-trend",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
        category_id: params?.category_id,
      },
    },
  );
  return data;
}
