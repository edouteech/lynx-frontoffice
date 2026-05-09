import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesSummary {
  total_products_sold: number;
  revenue_ht: number;
  discount: number;
  revenue_net: number;
  total_cost: number;
  profit: number;
}

export interface SalesSummaryResponse {
  success: boolean;
  data: SalesSummary;
}

export interface SalesSummaryParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  employee_id?: number;
}

/* ================= TYPES TREND (GRAPHE) ================= */

export interface SalesTrend {
  date: string;
  revenue_ht: number;
}

export interface SalesTrendResponse {
  success: boolean;
  data: SalesTrend[];
}

export interface SalesTrendParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  employee_id?: number;
}

/* ================= API ================= */

export async function fetchSalesSummary(
  params?: SalesSummaryParams,
): Promise<SalesSummaryResponse> {
  const { data } = await api.get<SalesSummaryResponse>(
    "/reports/sales-summary",
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

/* ================= API TREND (GRAPHE) ================= */

export async function fetchSalesTrend(
  params?: SalesTrendParams,
): Promise<SalesTrendResponse> {
  const { data } = await api.get<SalesTrendResponse>(
    "/reports/sales-trend",
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