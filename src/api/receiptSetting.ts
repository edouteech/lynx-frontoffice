import { api } from './apiClient'
import type { ReceiptSetting } from '../types/receiptSetting'

export async function fetchReceiptSetting(
  storeId: number | string
): Promise<ReceiptSetting> {
  const { data } = await api.get<ReceiptSetting>(
    `/stores/${storeId}/receipt-settings`
  )
  return data
}

export async function updateReceiptSetting(
  storeId: number | string,
  payload: {
    header_text?: string | null
    footer_text?: string | null
    sent_receipt_logo?: File | null
    printed_receipt_logo?: File | null
  }
): Promise<ReceiptSetting> {
  const form = new FormData()
  form.append('_method', 'PATCH')

  if (payload.header_text !== undefined) {
    form.append('header_text', payload.header_text ?? '')
  }
  if (payload.footer_text !== undefined) {
    form.append('footer_text', payload.footer_text ?? '')
  }
  if (payload.sent_receipt_logo) {
    form.append('sent_receipt_logo', payload.sent_receipt_logo)
  }
  if (payload.printed_receipt_logo) {
    form.append('printed_receipt_logo', payload.printed_receipt_logo)
  }

  const { data } = await api.post<ReceiptSetting>(
    `/stores/${storeId}/receipt-settings`,
    form
  )
  return data
}

