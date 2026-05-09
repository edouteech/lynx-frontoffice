import axios from 'axios'
import { API_URL } from '../config/env'
import { clearToken, getToken } from '../lib/authStorage'
import {
  clearStoredOrganizationId,
  getStoredOrganizationId,
} from '../lib/organizationStorage'
import { notifyUnauthorized } from './authEvents'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
})

/** Routes publiques (pas de Bearer, pas de redirection 401). */
export const apiPublic = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    const oid = getStoredOrganizationId()
    if (oid != null) {
      config.headers['X-Organization-Id'] = String(oid)
    }
  }

  // Let Axios set multipart content type for FormData.
  if (config.data instanceof FormData) {
    delete (config.headers as Record<string, string | undefined>)['Content-Type']
  } else if (!('Content-Type' in (config.headers ?? {}))) {
    ;(config.headers as Record<string, string | undefined>)['Content-Type'] =
      'application/json'
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const status = error.response?.status
    const url = String(error.config?.url ?? '')
    if (
      status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/register-organization') &&
      !url.includes('/auth/register-organization-request')
    ) {
      clearToken()
      clearStoredOrganizationId()
      notifyUnauthorized()
    }
    return Promise.reject(error)
  }
)

