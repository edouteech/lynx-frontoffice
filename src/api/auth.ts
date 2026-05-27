import type { LoginResponse, User } from '../types/api'
import { setToken, clearToken } from '../lib/authStorage'
import { api } from './apiClient'

export async function loginRequest(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  })
  setToken(data.token)
  return { user: data.user, token: data.token }
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/auth/user')
  return data
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch {
    /* token expiré ou réseau : on nettoie quand même localement */
  } finally {
    clearToken()
  }
}

/** Demande un e-mail de réinitialisation (réponse générique côté API). */
export async function requestPasswordReset(email: string, recaptchaToken: string): Promise<void> {
  await api.post('/auth/forgot-password', { email: email.trim(), recaptcha_token: recaptchaToken })
}

export async function resetPasswordWithToken(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}): Promise<void> {
  await api.post('/auth/reset-password', {
    email: payload.email.trim(),
    token: payload.token,
    password: payload.password,
    password_confirmation: payload.password_confirmation,
  })
}
