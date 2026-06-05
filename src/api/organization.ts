import { api } from './apiClient'
import type { Organization, User } from '../types/api'

export interface CreateOrganizationBody {
  name: string
  legal_name?: string
  tax_id?: string
  company_registration_number?: string
  address?: string
  phone?: string
  country: string
  currency: string
  timezone?: string | null
}

export interface CreateOrganizationResponse {
  organization: Organization
  user: User
}

export async function createOrganization(
  body: CreateOrganizationBody
): Promise<CreateOrganizationResponse> {
  const { data } = await api.post<CreateOrganizationResponse>(
    '/organizations',
    body
  )
  return data
}

export async function createOrganizationWithLogo(
  body: CreateOrganizationBody,
  logoFile: File
): Promise<CreateOrganizationResponse> {
  const form = new FormData()
  form.append('logo', logoFile)
  Object.entries(body).forEach(([k, v]) => {
    if (v === undefined) return
    form.append(k, v === null ? '' : String(v))
  })

  const { data } = await api.post<CreateOrganizationResponse>(
    '/organizations',
    form
  )
  return data
}

export async function updateOrganization(
  patch: Partial<
    Pick<
      Organization,
      | 'name'
      | 'legal_name'
      | 'tax_id'
      | 'company_registration_number'
      | 'address'
      | 'phone'
      | 'country'
      | 'currency'
      | 'timezone'
    >
  >
): Promise<Organization> {
  const { data } = await api.patch<Organization>('/organization', patch)
  return data
}

export async function updateOrganizationWithLogo(
  patch: Partial<
    Pick<
      Organization,
      | 'name'
      | 'legal_name'
      | 'tax_id'
      | 'company_registration_number'
      | 'address'
      | 'phone'
      | 'country'
      | 'currency'
      | 'timezone'
    >
  >,
  logoFile: File
): Promise<Organization> {
  const form = new FormData()
  // Laravel + multipart: more reliable through method spoofing.
  form.append('_method', 'PATCH')
  form.append('logo', logoFile)
  Object.entries(patch).forEach(([k, v]) => {
    if (v === undefined) return
    form.append(k, v === null ? '' : String(v))
  })

  const { data } = await api.post<Organization>('/organization', form)
  return data
}

