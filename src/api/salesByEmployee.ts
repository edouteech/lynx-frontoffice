import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByEmployee {
  id: number;
  employee: string;
  quantity_sold: number;
  total_cost: number;
  revenue_ht: number;
  discount_amount: number;
  revenue_net: number;
  profit: number;
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
