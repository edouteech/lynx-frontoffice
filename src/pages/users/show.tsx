import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import {
  attachUserStoreRole,
  detachUserStoreRole,
  fetchUser,
  updateUser,
  type UserStoreRoleRow,
} from '../../api/users'
import { fetchStores } from '../../api/stores'
import { fetchAllRoles } from '../../api/roles'
import { getApiErrorMessage } from '../../lib/apiError'
import {
  isOwnerRole,
  isOwnerRoleName,
} from '../../lib/ownerRole'
import { displayRoleName } from '../../lib/ownerRole'
import { scopedRole, scopedRoleId } from '../../lib/scopedOrganization'
import { useAuth } from '../../contexts/useAuth'
import type { Role, Store, User } from '../../types/api'
import { UserCreateModal } from './create'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

export default function UserShow() {
  const { id } = useParams<{ id: string }>()
  const { activeOrganizationId } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [roleId, setRoleId] = useState<number | ''>('')
  const [savingAccess, setSavingAccess] = useState(false)
  const [detachingKey, setDetachingKey] = useState<string | null>(null)
  const [attachNotice, setAttachNotice] = useState<string | null>(null)

  const loadUser = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) return
    const silent = options?.silent === true
    if (!silent) setLoading(true)
    setError(null)
    try {
      const u = await fetchUser(id)
      setUser(u)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setUser(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    if (!user) return
    setRoleId(scopedRoleId(user, activeOrganizationId) ?? '')
    setSelectedStoreIds(user.stores?.map((m) => m.id) ?? [])
  }, [user, activeOrganizationId])

  useEffect(() => {
    let cancelled = false
    async function loadRefs() {
      if (!user) return
      setLoadingRefs(true)
      try {
        const allM: Store[] = []
        let p = 1
        while (true) {
          const res = await fetchStores(p)
          allM.push(...(res.data ?? []))
          if (p >= res.last_page) break
          p += 1
        }
        const allR = await fetchAllRoles()
        if (!cancelled) {
          setStores(allM)
          setRoles(allR)
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoadingRefs(false)
      }
    }
    void loadRefs()
    return () => {
      cancelled = true
    }
  }, [user])

  const sortedAssignments = useMemo((): UserStoreRoleRow[] => {
    if (!user) return []
    const rid = scopedRoleId(user, activeOrganizationId)
    const roleObj = scopedRole(user, activeOrganizationId)
    if (rid == null || !roleObj) return []
    const roleName = roleObj.name
    return (user.stores ?? [])
      .map((m) => ({
        user_id: user.id,
        store_id: m.id,
        role_id: rid,
        role_name: roleName,
        store_name: m.name,
        created_at: m.pivot?.created_at ?? '',
        updated_at: m.pivot?.updated_at ?? '',
      }))
      .sort((a, b) => a.store_name.localeCompare(b.store_name, 'fr'))
  }, [user, activeOrganizationId])

  const assignableRoles = useMemo(
    () => roles.filter((r) => !isOwnerRole(r)),
    [roles]
  )

  const roleForScope = user ? scopedRole(user, activeOrganizationId) : null
  const isOwnerUser = Boolean(
    roleForScope && isOwnerRole(roleForScope)
  )

  const roleSelectionDirty = useMemo(() => {
    const server = user ? scopedRoleId(user, activeOrganizationId) ?? '' : ''
    const local = roleId === '' ? '' : roleId
    return server !== local
  }, [user, roleId, activeOrganizationId])

  const roleStoresDirty = useMemo(() => {
    const serverIds = (user?.stores ?? []).map((m) => m.id).sort((a, b) => a - b)
    const selected = [...selectedStoreIds].sort((a, b) => a - b)
    if (serverIds.length !== selected.length) return true
    return serverIds.some((sid, i) => sid !== selected[i])
  }, [user?.stores, selectedStoreIds])

  const accessDirty = useMemo(() => {
    if (isOwnerUser) return roleStoresDirty
    return roleSelectionDirty || roleStoresDirty
  }, [isOwnerUser, roleStoresDirty, roleSelectionDirty])

  const canPickStores = useMemo(
    () =>
      Boolean(
        isOwnerUser ||
          (user && scopedRoleId(user, activeOrganizationId)) ||
          roleId !== ''
      ),
    [isOwnerUser, user, roleId, activeOrganizationId]
  )

  useEffect(() => {
    if (roleId === '') return
    const current = roles.find((r) => r.id === roleId)
    if (current && isOwnerRole(current)) setRoleId('')
  }, [roles, roleId])

  function toggleStore(storeId: number) {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((x) => x !== storeId)
        : [...prev, storeId]
    )
  }

  function selectAllStores() {
    setSelectedStoreIds(stores.map((m) => m.id))
  }

  function clearStoreSelection() {
    setSelectedStoreIds([])
  }

  async function handleSaveAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !user) return

    if (isOwnerUser) {
      if (!roleStoresDirty) {
        setError(null)
        setAttachNotice('Aucun changement.')
        return
      }
      setSavingAccess(true)
      setError(null)
      setAttachNotice(null)
      try {
        const fromServer = new Set<number>((user.stores ?? []).map((m) => m.id))
        const desired = new Set(selectedStoreIds)
        const toAttach = selectedStoreIds.filter((mid) => !fromServer.has(mid))
        const toDetach = Array.from(fromServer).filter((mid) => !desired.has(mid))

        const ops: Promise<unknown>[] = [
          ...toAttach.map((storeId) =>
            attachUserStoreRole(id, { store_id: storeId })
          ),
          ...toDetach.map((storeId) =>
            detachUserStoreRole(id, storeId)
          ),
        ]

        const results = await Promise.allSettled(ops)
        const ok = results.filter((r) => r.status === 'fulfilled').length
        const fail = results.length - ok

        await loadUser({ silent: true })

        if (fail > 0) {
          const firstErr = results.find(
            (r): r is PromiseRejectedResult => r.status === 'rejected'
          )
          setError(
            `${ok} opération(s) réussie(s), ${fail} échec(s)${firstErr ? ` : ${getApiErrorMessage(firstErr.reason)}` : ''}.`
          )
        } else {
          setError(null)
          const parts: string[] = []
          if (toAttach.length) parts.push(`${toAttach.length} ajout(s)`)
          if (toDetach.length) parts.push(`${toDetach.length} retrait(s)`)
          setAttachNotice(`Enregistré : ${parts.join(', ')}.`)
        }
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setSavingAccess(false)
      }
      return
    }

    if (!accessDirty) {
      setError(null)
      setAttachNotice('Aucun changement.')
      return
    }

    if (
      selectedStoreIds.length > 0 &&
      roleId === '' &&
      scopedRoleId(user, activeOrganizationId) == null
    ) {
      setError('Choisissez un rôle pour attribuer des magasins.')
      return
    }

    setSavingAccess(true)
    setError(null)
    setAttachNotice(null)

    try {
      if (roleSelectionDirty) {
        await updateUser(id, {
          role_id: roleId === '' ? null : Number(roleId),
        })
      }

      const fresh = await fetchUser(id)

      if (scopedRoleId(fresh, activeOrganizationId) == null) {
        const mids = fresh.stores?.map((m) => m.id) ?? []
        if (mids.length > 0) {
          const detachResults = await Promise.allSettled(
            mids.map((mid) => detachUserStoreRole(id, mid))
          )
          const fail = detachResults.filter((r) => r.status === 'rejected')
            .length
          if (fail > 0) {
            setError('Une partie des retraits magasin a échoué.')
          }
        }
        await loadUser({ silent: true })
        setAttachNotice(
          mids.length
            ? 'Rôle retiré et accès magasins mis à jour.'
            : 'Enregistré.'
        )
        return
      }

      const fromServer = new Set<number>((fresh.stores ?? []).map((m) => m.id))
      const toAttach = selectedStoreIds.filter((mid) => !fromServer.has(mid))
      const toDetach = Array.from(fromServer).filter(
        (mid) => !selectedStoreIds.includes(mid)
      )

      if (toAttach.length === 0 && toDetach.length === 0) {
        await loadUser({ silent: true })
        setAttachNotice(
          roleSelectionDirty ? 'Rôle enregistré.' : 'Aucun changement.'
        )
        return
      }

      const ops: Promise<unknown>[] = [
        ...toAttach.map((storeId) =>
          attachUserStoreRole(id, { store_id: storeId })
        ),
        ...toDetach.map((storeId) =>
          detachUserStoreRole(id, storeId)
        ),
      ]

      const results = await Promise.allSettled(ops)
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - ok

      await loadUser({ silent: true })

      if (fail > 0) {
        const firstErr = results.find(
          (r): r is PromiseRejectedResult => r.status === 'rejected'
        )
        setError(
          `${ok} opération(s) réussie(s), ${fail} échec(s)${firstErr ? ` : ${getApiErrorMessage(firstErr.reason)}` : ''}.`
        )
      } else {
        setError(null)
        const bits: string[] = []
        if (roleSelectionDirty) bits.push('rôle')
        if (toAttach.length) {
          bits.push(`${toAttach.length} magasin(s) ajouté(s)`)
        }
        if (toDetach.length) {
          bits.push(`${toDetach.length} retrait(s)`)
        }
        setAttachNotice(`Enregistré : ${bits.join(', ')}.`)
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSavingAccess(false)
    }
  }

  async function handleDetach(row: UserStoreRoleRow) {
    if (!id) return
    const key = `${row.store_id}-${row.role_id}`
    if (
      !window.confirm(
        `Retirer l’accès au magasin « ${row.store_name} » pour le rôle « ${displayRoleName(row.role_name)} » ?`
      )
    )
      return
    setDetachingKey(key)
    setError(null)
    try {
      await detachUserStoreRole(id, row.store_id)
      await loadUser({ silent: true })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setDetachingKey(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <p className="text-lg text-gray-600">Chargement…</p>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Link
          to="/users"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Utilisateurs
        </Link>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4" />
          Modifier le profil
        </button>
      </div>

      {attachNotice && (
        <div
          className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <span>{attachNotice}</span>
          <button
            type="button"
            onClick={() => setAttachNotice(null)}
            className="shrink-0 text-emerald-800 underline hover:text-emerald-950"
          >
            Fermer
          </button>
        </div>
      )}

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className=" space-y-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Informations du compte
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Données enregistrées pour cet utilisateur dans votre entreprise.
          </p>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Nom complet
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {user.name}
              </dd>
            </div>
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Adresse e-mail
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
                {user.email}
              </dd>
            </div>
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Téléphone
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {user.phone?.trim() ? user.phone : '—'}
              </dd>
            </div>
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Remarque
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-gray-900">
                {user.note?.trim() ? user.note : '—'}
              </dd>
            </div>
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Compte créé le
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {formatDateTime(user.created_at)}
              </dd>
            </div>
            <div className="border-b border-gray-100 pb-4 sm:border-0 sm:pb-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Dernière mise à jour
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {formatDateTime(user.updated_at)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Rôle et magasins
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Un seul rôle par utilisateur, appliqué à chaque magasin coché. Vous
            pouvez tout définir puis enregistrer une seule fois : le rôle est
            sauvegardé en premier, puis les magasins.
          </p>

          <form onSubmit={handleSaveAccess} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Rôle</h3>
              {isOwnerUser ? (
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Propriétaire</span>
                  <span className="ml-2 text-gray-500">(non modifiable)</span>
                </p>
              ) : (
                <div className="min-w-[240px] max-w-md">
                  <label
                    htmlFor="assign-role"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Rôle
                  </label>
                  <select
                    id="assign-role"
                    disabled={loadingRefs || savingAccess}
                    value={roleId === '' ? '' : String(roleId)}
                    onChange={(e) =>
                      setRoleId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50"
                  >
                    <option value="">Aucun rôle</option>
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div
              className="border-t border-gray-100 pt-6"
              aria-hidden="true"
            />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Magasins d’accès
              </h3>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Magasins ({selectedStoreIds.length} coché
                    {selectedStoreIds.length !== 1 ? 's' : ''})
                    {accessDirty ? (
                      <span className="ml-2 font-normal normal-case text-amber-700">
                        · modifications non enregistrées
                      </span>
                    ) : null}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        loadingRefs || savingAccess || stores.length === 0
                      }
                      onClick={selectAllStores}
                      className="text-xs font-medium text-[#3B82F6] hover:text-[#2563EB] disabled:opacity-40"
                    >
                      Tout cocher
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      disabled={loadingRefs || savingAccess}
                      onClick={clearStoreSelection}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>
                {!canPickStores ? (
                  <p className="mb-3 text-sm text-amber-800">
                    Choisissez un rôle ci-dessus pour pouvoir cocher des magasins.
                  </p>
                ) : null}
                <div
                  className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-slate-50/90 p-3"
                  role="group"
                  aria-label="Magasins accessibles"
                >
                  {stores.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun magasin.</p>
                  ) : (
                    stores.map((m) => {
                      const checked = selectedStoreIds.includes(m.id)
                      const wasAlready = Boolean(
                        user.stores?.some((x) => x.id === m.id)
                      )
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={
                              loadingRefs || savingAccess || !canPickStores
                            }
                            onChange={() => toggleStore(m.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                          />
                          <span className="flex flex-1 flex-wrap items-center gap-2 text-sm text-gray-800">
                            {m.name}
                            {wasAlready && checked ? (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-blue-800">
                                Déjà attribué
                              </span>
                            ) : null}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingAccess || loadingRefs || !accessDirty}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
            >
              {savingAccess ? 'Enregistrement…' : 'Enregistrer les accès'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Récapitulatif des accès
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Rôle unique et magasins associés.
          </p>
          {sortedAssignments.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun accès magasin. Attribuez un rôle puis cochez des magasins
              ci-dessus.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 pr-4 font-semibold">Rôle</th>
                    <th className="pb-3 pr-4 font-semibold">Magasin</th>
                    <th className="pb-3 w-28 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssignments.map((row) => {
                    const key = `${row.store_id}-${row.role_id}`
                    const locked = isOwnerRoleName(row.role_name)
                    return (
                      <tr
                        key={key}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {displayRoleName(row.role_name)}
                          {locked ? (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              (réservé créateur)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {row.store_name}
                        </td>
                        <td className="py-3 text-right">
                          {locked ? (
                            <span
                              className="text-xs text-gray-400"
                              title="Le rôle Propriétaire ne peut pas être modifié ici"
                            >
                              —
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDetach(row)}
                              disabled={detachingKey === key}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              title="Retirer cet accès"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Retirer
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <UserCreateModal
        open={modalOpen}
        user={user}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void loadUser({ silent: true })
        }}
      />
    </div>
  )
}
