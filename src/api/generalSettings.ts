import { api } from './apiClient'
import type { GeneralSetting } from '../types/generalSetting'

export async function fetchGeneralSetting(): Promise<GeneralSetting> {
  const { data } = await api.get<GeneralSetting>('/general-settings')
  return data
}

export async function updateGeneralSetting(
  patch: Partial<
    Pick<
      GeneralSetting,
      | 'work_periods'
      | 'time_tracking'
      | 'open_tickets'
      | 'kitchen_printers'
      | 'customer_display'
      | 'restaurant_options'
      | 'low_stock_notifications'
      | 'negative_stock_alerts'
      | 'item_buyback'
      | 'payment_methods'
      | 'customer_account_payment'
      | 'commission'
    >
  >
): Promise<GeneralSetting> {
  const { data } = await api.patch<GeneralSetting>('/general-settings', patch)
  return data
}

