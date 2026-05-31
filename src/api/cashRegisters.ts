import type { CashRegister, Paginated } from '../types/api'
import { api } from './apiClient'

export async function fetchCashRegisters(
  page = 1,
  statusFilter?: string,
  storeId?: number | string,
  only_trashed?: boolean
): Promise<Paginated<CashRegister>> {
  const params: Record<string, string | number | boolean> = { page }
  if (statusFilter) params.status = statusFilter
  if (storeId != null && String(storeId) !== '') params.store_id = storeId
  if (only_trashed) params.only_trashed = true
  const { data } = await api.get<Paginated<CashRegister>>('/cash-registers', {
    params,
  })
  return data
}

export async function restoreCashRegister(id: number | string): Promise<CashRegister> {
  const { data } = await api.post<CashRegister>(`/cash-registers/${id}/restore`)
  return data
}

export async function fetchCashRegister(id: number | string): Promise<CashRegister> {
  const { data } = await api.get<CashRegister>(`/cash-registers/${id}`)
  return data
}

export async function createCashRegister(body: {
  name: string
  store_id: number | string
  status?: string
}): Promise<CashRegister> {
  const { data } = await api.post<CashRegister>('/cash-registers', body)
  return data
}

export async function updateCashRegister(
  id: number | string,
  body: {
    name?: string
    store_id?: number | string
    status?: string
  }
): Promise<CashRegister> {
  const { data } = await api.patch<CashRegister>(`/cash-registers/${id}`, body)
  return data
}

export async function deleteCashRegister(id: number | string): Promise<void> {
  await api.delete(`/cash-registers/${id}`)
}

export async function toggleCashRegisterStatus(
  id: number | string,
  currentStatus: string
): Promise<CashRegister> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  return updateCashRegister(id, { status: newStatus })
}

