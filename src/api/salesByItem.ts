import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByItem {
  product: string;
  quantity_sold: number;
  total_cost: number;
  total_cost_ht: number;
  total_cost_ttc: number;
  revenue_ht: number;
  discount_amount: number;
  revenue_net: number;
  profit: number;
  margin_percent: number;
}

export interface SalesByItemResponse {
  success: boolean;
  data: SalesByItem[];
  top_selling: SalesByItem[];
  least_selling: SalesByItem[];
}

export interface SalesByItemParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  seller_name?: string;
}

/* ================= API ================= */

export async function fetchSalesByItem(
  params?: SalesByItemParams,
): Promise<SalesByItemResponse> {
  const { data } = await api.get<SalesByItemResponse>(
    "/reports/sales-by-item",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
        seller_name: params?.seller_name,
      },
    },
  );

  return data;
}
