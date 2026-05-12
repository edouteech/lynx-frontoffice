import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesSummary {
  total_transactions: number;
  total_items_sold: number;
  total_products_sold: number; // compat
  revenue_ttc_gross: number;
  revenue_ht_gross: number;
  discount_ttc: number;
  discount: number; // compat
  revenue_ttc: number;
  revenue_ht: number;
  revenue_net: number; // compat
  total_cost_ttc: number;
  total_cost_ht: number;
  total_cost: number; // compat
  commission_amount: number;
  profit_ht: number;
  profit: number; // compat
  profit_margin_pct: number;
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
  revenue_net: number;
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

/* ================= TYPES DETAILED (TABLEAU CROISÉ) ================= */

export interface DetailedSummary {
  agency: string;
  total_vente: number;
  depenses: number;
  comm_a_prendre: number;
  rowType?: 'normal' | 'subtotal' | 'partner' | 'grandtotal';
  categories: Record<number, number>; // catId -> amount
  payments: Record<number, number>;   // pmId -> amount
}

export interface DetailedSummaryResponse {
  success: boolean;
  data: DetailedSummary[];
  categories: { id: number; name: string }[];
  payment_methods: { id: number; name: string }[];
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

/* ================= API DETAILED ================= */

export async function fetchDetailedSummary(
  params?: SalesSummaryParams,
): Promise<DetailedSummaryResponse> {
  const { data } = await api.get<DetailedSummaryResponse>(
    "/reports/detailed-summary",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
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