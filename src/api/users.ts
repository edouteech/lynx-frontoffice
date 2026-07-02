import type { Paginated, User } from '../types/api'
import { api } from './apiClient'

export interface UserStoreRoleRow {
  user_id: number
  store_id: number
  role_id: number
  store_name: string
  role_name: string
  created_at: string
  updated_at: string
}

export async function fetchUsers(
  page = 1,
  q?: string
): Promise<Paginated<User>> {
  const params: Record<string, string | number> = { page }
  if (q?.trim()) params.q = q.trim()
  const { data } = await api.get<Paginated<User>>('/users', { params })
  return data
}

export async function fetchUser(id: number | string): Promise<User> {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}

export async function createUser(body: {
  name: string
  email: string
  password: string
  phone?: string | null
  pin_code?: string | null
  note?: string | null
  role_id?: number | null
}): Promise<User> {
  const { data } = await api.post<User>('/users', body)
  return data
}

/** Attach an existing account by email after duplicate-email conflict. */
export async function attachExistingUserToOrganization(body: {
  email: string
  role_id?: number | null
}): Promise<User> {
  const { data } = await api.post<User>('/users', {
    email: body.email.trim(),
    attach_existing: true,
    ...(body.role_id != null ? { role_id: body.role_id } : {}),
  })
  return data
}

export type UserEmailExistsPayload = {
  message: string
  code: 'user_email_exists'
  user: { id: number; name: string; email: string }
}

export type UserEmailCheckResponse =
  | { status: 'not_found'; email: string }
  | {
      status: 'in_current_organization' | 'in_another_organization'
      email: string
      user: { id: number; name: string; email: string }
    }

export async function checkUserEmail(email: string): Promise<UserEmailCheckResponse> {
  const { data } = await api.get<UserEmailCheckResponse>('/users/email-check', {
    params: { email: email.trim() },
  })
  return data
}

export async function updateUser(
  id: number | string,
  body: {
    name?: string
    email?: string
    password?: string
    phone?: string | null
    pin_code?: string | null
    note?: string | null
    role_id?: number | null
  }
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, body)
  return data
}

export async function fetchUserStoreRoles(
  userId: number | string
): Promise<UserStoreRoleRow[]> {
  const { data } = await api.get<UserStoreRoleRow[]>(
    `/users/${userId}/store-roles`
  )
  return data
}

export async function attachUserStoreRole(
  userId: number | string,
  body: { store_id: number }
): Promise<void> {
  await api.post(`/users/${userId}/store-roles`, body)
}

export async function detachUserStoreRole(
  userId: number | string,
  storeId: number | string
): Promise<void> {
  await api.delete(`/users/${userId}/store-roles/${storeId}`)
}

/** Regenerates the user's password and re-sends the login credentials by email. */
export async function resendUserCredentials(
  userId: number | string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/users/${userId}/resend-credentials`
  )
  return data
}
