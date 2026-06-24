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

export async function updateGeneralSettingWithCover(
  coverFile: File | null
): Promise<GeneralSetting> {
  const form = new FormData()
  form.append('_method', 'PATCH')
  if (coverFile) {
    form.append('store_cover_image', coverFile)
  } else {
    // If we want to clear the cover, maybe send an empty string
    // but the backend doesn't explicitly handle clearing right now.
  }

  const { data } = await api.post<GeneralSetting>('/general-settings', form)
  return data
}

