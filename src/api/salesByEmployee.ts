import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByEmployee {
  id: number;
  employee: string;
  total_transactions: number;
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
  commission_amount: number;
}

export interface SalesByEmployeeResponse {
  success: boolean;
  data: SalesByEmployee[];
}

export interface SalesByEmployeeParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
}

/* ================= API ================= */

export async function fetchSalesByEmployee(
  params?: SalesByEmployeeParams,
): Promise<SalesByEmployeeResponse> {
  const { data } = await api.get<SalesByEmployeeResponse>(
    "/reports/sales-by-employee",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
      },
    },
  );

  return data;
}
