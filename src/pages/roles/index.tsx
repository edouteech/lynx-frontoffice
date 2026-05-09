import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deleteRole, fetchRoles } from '../../api/roles'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Role } from '../../types/api'
import { isOwnerRole } from '../../lib/ownerRole'
import { RoleFormModal } from './create'

export default function RolesIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Role[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRole, setModalRole] = useState<Role | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    const res = await fetchRoles(page)
    setPaginated({
      data: res.data,
      current_page: res.current_page,
      last_page: res.last_page,
      total: res.total,
    })
  }, [page])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchRoles(page)
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
  }, [page])

  const handleDelete = useCallback(
    async (r: Role) => {
      if (!window.confirm(`Supprimer le rôle « ${r.name} » ?`)) return
      setError(null)
      try {
        await deleteRole(r.id)
        await refreshList()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [refreshList]
  )

  const columns: Column<Role>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nom',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-gray-900">{String(v)}</span>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        render: (v) =>
          v ? (
            <span className="line-clamp-2 text-gray-700">{String(v)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'permissions_count',
        label: 'Permissions',
        align: 'right',
        nowrap: true,
        render: (v) => (
          <span className="font-semibold text-gray-800">
            {v != null ? String(v) : '—'}
          </span>
        ),
      },
    ],
    []
  )

  const actions: Action<Role>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        show: (r) => !isOwnerRole(r),
        onClick: (r) => {
          setModalRole(r)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        show: (r) => !isOwnerRole(r),
        onClick: (r) => void handleDelete(r),
      },
    ],
    [handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F2E4A] shadow-sm">
              <Shield className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-semibold text-gray-900">Rôles</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Créez des rôles et associez-y les permissions (caisse et panneau
            d’administration).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalRole(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouveau rôle
        </button>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <DataTable<Role>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="roles"
        searchable
        searchPlaceholder="Rechercher un rôle…"
        pagination={false}
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: setPage,
                disabled: loading,
              }
            : undefined
        }
        emptyMessage={
          <span>
            Aucun rôle.{' '}
            <button
              type="button"
              onClick={() => {
                setModalRole(null)
                setModalOpen(true)
              }}
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Créer un rôle
            </button>
          </span>
        }
        getRowId={(r) => r.id}
      />

      <RoleFormModal
        open={modalOpen}
        role={modalRole}
        onClose={() => {
          setModalOpen(false)
          setModalRole(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}
