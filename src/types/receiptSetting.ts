export interface ReceiptSetting {
  id: number
  organization_id: number
  store_id: number
  header_text: string | null
  footer_text: string | null
  sent_receipt_logo: string | null
  printed_receipt_logo: string | null
  created_at: string
  updated_at: string
}

