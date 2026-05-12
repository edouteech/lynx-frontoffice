import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByPaymentMethod {
  payment_method: string;
  store_name: string;
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

export interface SalesByPaymentMethodSummary {
  total_revenue_ht: number;
  total_discount: number;
  total_revenue_net: number;
  total_profit: number;
}

export interface SalesByPaymentMethodResponse {
  success: boolean;
  summary: SalesByPaymentMethodSummary;
  data: SalesByPaymentMethod[];
}

export interface SalesByPaymentMethodParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  employee_id?: number;
  payment_method_id?: number;
}

/* ================= API ================= */

export async function fetchSalesByPaymentMethod(
  params?: SalesByPaymentMethodParams,
): Promise<SalesByPaymentMethodResponse> {
  const { data } = await api.get<SalesByPaymentMethodResponse>(
    "/reports/sales-by-payment-method",
    {
      params: {
        start_date: params?.start_date,
        end_date: params?.end_date,
        store_id: params?.store_id,
        employee_id: params?.employee_id,
        payment_method_id: params?.payment_method_id,
      },
    },
  );

  return data;
}