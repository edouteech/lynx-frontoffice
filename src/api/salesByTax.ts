import { api } from "./apiClient";

/* ================= TYPES ================= */

export interface SalesByTax {
  tax_name: string;
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
  total_ttc: number;
}

export interface SalesByTaxResponse {
  success: boolean;
  data: SalesByTax[];
}

export interface SalesByTaxParams {
  start_date?: string;
  end_date?: string;
  store_id?: number;
  seller_name?: string;
}

/* ================= API ================= */

export async function fetchSalesByTax(
  params?: SalesByTaxParams,
): Promise<SalesByTaxResponse> {
  const { data } = await api.get<SalesByTaxResponse>(
    "/reports/sales-by-tax",
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
