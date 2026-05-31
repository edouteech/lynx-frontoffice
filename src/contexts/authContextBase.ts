import { createContext } from 'react'
import type { Organization, User } from '../types/api'

export interface AuthState {
  user: User | null
  bootstrapping: boolean
  /** Active organization used for scoped API calls. */
  activeOrganizationId: number | null
  setActiveOrganizationId: (id: number) => void
  currentOrganization: Organization | null
  login: (email: string, password: string) => Promise<{ user: User; activeOrganizationId: number | null }>
  logout: () => Promise<void>
  /** Après inscription : enregistre le token et l’utilisateur (même format que la connexion). */
  applyAuthResponse: (data: { token: string; user: User }) => void
  /** Update profile and active organization after creation. */
  applyUserAndOrganization: (user: User, organizationId: number) => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

