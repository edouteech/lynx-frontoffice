import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Mail, Pencil, Plus, Search } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import { fetchUsers, resendUserCredentials, updateUserStatus } from '../../api/users'
import { fetchAllRoles } from '../../api/roles'
import { getApiErrorMessage } from '../../lib/apiError'
import { scopedIsActive, scopedRole, scopedRoleId } from '../../lib/scopedOrganization'
import { useAuth } from '../../contexts/useAuth'
import { displayRoleName, isOwnerRole } from '../../lib/ownerRole'
import type { Role, User } from '../../types/api'

function roleLabelForUser(
  user: User,
  roleById: Map<number, string>,
  activeOrganizationId: number | null
): string | null {
  const rid = scopedRoleId(user, activeOrganizationId)
  const r = scopedRole(user, activeOrganizationId)
  if (rid != null) {
    return displayRoleName(roleById.get(rid) ?? r?.name) || `Rôle #${rid}`
  }
  if (r?.name) return displayRoleName(r.name)
  return null
}
import { UserCreateModal } from './create'

export default function UsersIndex() {
  const navigate = useNavigate()
  const { user: currentUser, activeOrganizationId } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [paginated, setPaginated] = useState<{
    data: User[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalUser, setModalUser] = useState<User | null>(null)
  const [rolesCatalog, setRolesCatalog] = useState<Role[] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAllRoles()
      .then((list) => {
        if (!cancelled) setRolesCatalog(list)
      })
      .catch(() => {
        if (!cancelled) setRolesCatalog([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const roleById = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rolesCatalog ?? []) {
      m.set(r.id, r.name)
    }
    return m
  }, [rolesCatalog])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchUsers(page, debouncedQ || undefined)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }, [page, debouncedQ])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchUsers(page, debouncedQ || undefined)
        if (!cancelled) {
          setPaginated({
            data: res.data,
            current_page: res.current_page,
            last_page: res.last_page,
            total: res.total,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError(getApiErrorMessage(e))
          setPaginated(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [page, debouncedQ])

  const handleResendCredentials = useCallback(async (u: User) => {
    if (resendingId !== null) return
    if (
      !window.confirm(
        `Renvoyer les identifiants de connexion à « ${u.name} » (${u.email}) ? Un nouveau mot de passe sera généré et l’ancien ne fonctionnera plus.`
      )
    )
      return
    setNotice(null)
    setError(null)
    setResendingId(u.id)
    try {
      await resendUserCredentials(u.id)
      setNotice(`Identifiants renvoyés par e-mail à ${u.email}.`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setResendingId(null)
    }
  }, [resendingId])

  const handleToggleStatus = useCallback(async (u: User, next: boolean) => {
    if (togglingId !== null) return
    const verb = next ? 'réactiver' : 'désactiver'
    if (!window.confirm(`Voulez-vous ${verb} « ${u.name} » dans cette entreprise ?`)) return
    setNotice(null)
    setError(null)
    setTogglingId(u.id)
    try {
      await updateUserStatus(u.id, next)
      setNotice(`« ${u.name} » a été ${next ? 'réactivé' : 'désactivé'}.`)
      void refreshList()
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }, [togglingId, refreshList])

  const columns: Column<User>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      {
        key: 'phone',
        label: 'Téléphone',
        sortable: true,
        render: (v) =>
          v ? String(v) : <span className="text-gray-400">—</span>,
      },
      {
        key: 'roles_display',
        label: 'Rôles',
        render: (_v, row) => {
          if (rolesCatalog === null) {
            return <span className="text-gray-400">…</span>
          }
          const label = roleLabelForUser(row, roleById, activeOrganizationId)
          if (!label) {
            return <span className="text-gray-400">—</span>
          }
          return (
            <span className="line-clamp-2 text-gray-700" title={label}>
              {label}
            </span>
          )
        },
      },
      {
        key: 'status',
        label: 'Statut',
        render: (_v, row) => {
          const role = scopedRole(row, activeOrganizationId)
          const locked = row.id === currentUser?.id || Boolean(role && isOwnerRole(role))
          return (
            <ToggleSwitch
              checked={scopedIsActive(row, activeOrganizationId)}
              disabled={locked || togglingId === row.id}
              onChange={(next) => void handleToggleStatus(row, next)}
              label={locked ? 'Statut non modifiable' : 'Activer/désactiver ce compte'}
            />
          )
        },
      },
    ],
    [rolesCatalog, roleById, activeOrganizationId, currentUser?.id, togglingId, handleToggleStatus]
  )

  const actions: Action<User>[] = useMemo(
    () => [
      {
        label: 'Voir',
        icon: Eye,
        variant: 'primary',
        onClick: (u) => navigate(`/users/${u.id}`),
      },
      {
        label: 'Modifier',
        icon: Pencil,
        onClick: (u) => {
          setModalUser(u)
          setModalOpen(true)
        },
      },
      {
        label: 'Renvoyer les identifiants',
        icon: Mail,
        onClick: (u) => void handleResendCredentials(u),
      },
    ],
    [navigate, handleResendCredentials]
  )

  const searchFilter = (
    <div className="relative min-w-[220px] max-w-sm flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Rechercher par nom ou email…"
        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        aria-label="Rechercher un utilisateur"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-gray-600">
            Comptes collaborateurs : rôle unique et magasins depuis la fiche détail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalUser(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </header>

      {notice && (
        <div
          className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
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

      <DataTable<User>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="utilisateurs"
        searchable={false}
        customFilters={searchFilter}
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: (p) => setPage(p),
                disabled: loading,
              }
            : undefined
        }
        emptyMessage="Aucun utilisateur"
      />

      <UserCreateModal
        open={modalOpen}
        user={modalUser}
        onClose={() => {
          setModalOpen(false)
          setModalUser(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}
