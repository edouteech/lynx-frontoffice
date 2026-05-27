import { apiPublic } from './apiClient'
import type { LoginResponse } from '../types/api'

export interface RegisterOrganizationPayload {
  name: string
  country: string
  currency: string
  timezone?: string | null
  email: string
  password: string
  phone?: string | null
  /** If empty, organization name is used for account name. */
  owner_name?: string | null
  recaptcha_token: string
}

export async function registerOrganization(
  payload: RegisterOrganizationPayload
): Promise<LoginResponse> {
  const { data } = await apiPublic.post<LoginResponse>(
    '/auth/register-organization',
    {
      name: payload.name.trim(),
      country: payload.country.trim(),
      currency: payload.currency.trim(),
      timezone: payload.timezone ?? null,
      email: payload.email.trim(),
      password: payload.password,
      phone: payload.phone?.trim() || null,
      owner_name: payload.owner_name?.trim() || null,
      recaptcha_token: payload.recaptcha_token,
    }
  )
  return data
}

export interface OrganizationRegistrationRequestPayload {
  name: string
  country: string
  currency: string
  timezone?: string | null
  email: string
  phone?: string | null
  legal_name?: string | null
  owner_name?: string | null
  recaptcha_token: string
}

export type OrganizationRegistrationRequestRow = {
  id: number
  status: string
  name: string
  email: string
  country: string
  currency: string
  created_at: string
}

export interface OrganizationRegistrationRequestResponse {
  message: string
  organization_registration_request: OrganizationRegistrationRequestRow
}

/**
 * Demande d’ouverture (validation admin) — pas de token, pas de connexion immédiate.
 */
export async function submitOrganizationRegistrationRequest(
  payload: OrganizationRegistrationRequestPayload
): Promise<OrganizationRegistrationRequestResponse> {
  const { data } =
    await apiPublic.post<OrganizationRegistrationRequestResponse>(
      '/auth/register-organization-request',
      {
        name: payload.name.trim(),
        country: payload.country.trim(),
        currency: payload.currency.trim(),
        timezone: payload.timezone ?? null,
        email: payload.email.trim(),
        phone: payload.phone?.trim() || null,
        legal_name: payload.legal_name?.trim() || null,
        owner_name: payload.owner_name?.trim() || null,
        recaptcha_token: payload.recaptcha_token,
      }
    )
  return data
}
