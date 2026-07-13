export interface GeneralSetting {
  id: number
  organization_id: number
  work_periods: boolean
  time_tracking: boolean
  open_tickets: boolean
  kitchen_printers: boolean
  customer_display: boolean
  restaurant_options: boolean
  low_stock_notifications: boolean
  negative_stock_alerts: boolean
  item_buyback: boolean
  payment_methods: boolean
  customer_account_payments: boolean
  commission: boolean
  online_articles: boolean
  store_cover_image?: string | null
  created_at: string
  updated_at: string
}

