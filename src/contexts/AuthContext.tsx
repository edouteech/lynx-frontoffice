import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCurrentUser, loginRequest, logoutRequest } from '../api/auth'
import { setUnauthorizedListener } from '../api/authEvents'
import { clearToken, getToken, setToken } from '../lib/authStorage'
import {
  clearStoredOrganizationId,
  setStoredOrganizationId,
} from '../lib/organizationStorage'
import { syncStoredOrganizationIdWithUser } from '../lib/syncStoredOrganization'
import type { Organization, User } from '../types/api'
import { AuthContext } from './authContextBase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<
    number | null
  >(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  const clearSession = useCallback(() => {
    clearToken()
    clearStoredOrganizationId()
    setActiveOrganizationIdState(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedListener(() => {
      clearSession()
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedListener(null)
  }, [navigate, clearSession])

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!getToken()) {
        setBootstrapping(false)
        return
      }
      try {
        const u = await fetchCurrentUser()
        if (!cancelled) {
          const oid = syncStoredOrganizationIdWithUser(u)
          setActiveOrganizationIdState(oid)
          setUser(u)
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await loginRequest(email, password)
    const oid = syncStoredOrganizationIdWithUser(u)
    setActiveOrganizationIdState(oid)
    setUser(u)
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await fetchCurrentUser()
    const oid = syncStoredOrganizationIdWithUser(u)
    setActiveOrganizationIdState(oid)
    setUser(u)
  }, [])

  const applyAuthResponse = useCallback((data: { token: string; user: User }) => {
    setToken(data.token)
    const oid = syncStoredOrganizationIdWithUser(data.user)
    setActiveOrganizationIdState(oid)
    setUser(data.user)
  }, [])

  const applyUserAndOrganization = useCallback((u: User, organizationId: number) => {
    setStoredOrganizationId(organizationId)
    setActiveOrganizationIdState(organizationId)
    setUser(u)
  }, [])

  const setActiveOrganizationId = useCallback(
    (id: number) => {
      if (!user?.organization_memberships?.some((m) => m.organization_id === id)) {
        return
      }
      setStoredOrganizationId(id)
      setActiveOrganizationIdState(id)
      void refreshUser()
    },
    [user, refreshUser]
  )

  const currentOrganization = useMemo((): Organization | null => {
    if (!user || activeOrganizationId == null) return null
    const m = user.organization_memberships?.find(
      (x) => x.organization_id === activeOrganizationId
    )
    return m?.organization ?? null
  }, [user, activeOrganizationId])

  const logout = useCallback(async () => {
    await logoutRequest()
    clearStoredOrganizationId()
    setActiveOrganizationIdState(null)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      activeOrganizationId,
      setActiveOrganizationId,
      currentOrganization,
      login,
      logout,
      applyAuthResponse,
      applyUserAndOrganization,
      refreshUser,
    }),
    [
      user,
      bootstrapping,
      activeOrganizationId,
      setActiveOrganizationId,
      currentOrganization,
      login,
      logout,
      applyAuthResponse,
      applyUserAndOrganization,
      refreshUser,
    ]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
