import type { CashRegisterSession } from '../types/api'
import { api } from './apiClient'

export async function fetchCashRegisterSessions(
  cashRegisterId: number | string
): Promise<CashRegisterSession[]> {
  const { data } = await api.get<CashRegisterSession[]>(
    `/cash-registers/${cashRegisterId}/sessions`
  )
  return data
}

export async function fetchCashRegisterSession(
  cashRegisterId: number | string,
  sessionId: number | string
): Promise<CashRegisterSession> {
  const { data } = await api.get<CashRegisterSession>(
    `/cash-registers/${cashRegisterId}/sessions/${sessionId}`
  )
  return data
}

export async function openCashRegisterSession(
  cashRegisterId: number | string,
  body: { opening_balance: number; note?: string | null }
): Promise<CashRegisterSession> {
  const { data } = await api.post<CashRegisterSession>(
    `/cash-registers/${cashRegisterId}/sessions/open`,
    body
  )
  return data
}

export async function closeCashRegisterSession(
  cashRegisterId: number | string,
  sessionId: number | string,
  body: { closing_balance: number; note?: string | null }
): Promise<CashRegisterSession> {
  const { data } = await api.patch<CashRegisterSession>(
    `/cash-registers/${cashRegisterId}/sessions/${sessionId}/close`,
    body
  )
  return data
}
