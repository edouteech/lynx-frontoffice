import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByCategory {
  id: number;
  category: string;
  quantity_sold: number;
  total_cost_ht: number;
  total_cost_ttc: number;
  revenue_ht: number;
  revenue_ttc: number;
  revenue_net: number;
  discount_amount: number;
  profit_ht: number;
  profit: number;
  margin_percent: number;
}

export interface SalesByCategoryResponse {
  success: boolean;
  data: SalesByCategory[];
}

export interface SalesByCategoryParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  employee_id?: number;
}

/* ================= API ================= */

export async function fetchSalesByCategory(
  params?: SalesByCategoryParams,
): Promise<SalesByCategoryResponse> {
  const { data } = await api.get<SalesByCategoryResponse>(
    "/reports/sales-by-category",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
        employee_id: params?.employee_id,
      },
    },
  );

  return data;
}
