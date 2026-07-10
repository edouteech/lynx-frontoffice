import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import { deleteStore, fetchStores, updateStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Store } from '../../types/api'
import { STORE_STATUS_OPTIONS } from './constants'
import { StoreCreateModal } from './create'

export default function StoresIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [paginated, setPaginated] = useState<{
    data: Store[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStore, setModalStore] = useState<Store | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchStores(page, statusFilter || undefined)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }, [page, statusFilter])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchStores(page, statusFilter || undefined)
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
  }, [page, statusFilter])

  const handleDelete = useCallback(
    async (m: Store) => {
      if (!window.confirm(`Supprimer le magasin « ${m.name} » ?`)) return
      setError(null)
      try {
        await deleteStore(m.id)
        const res = await fetchStores(page, statusFilter || undefined)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [page, statusFilter]
  )

  const handleToggleStatus = useCallback(async (m: Store, next: boolean) => {
    if (togglingId !== null) return
    setError(null)
    setTogglingId(m.id)
    try {
      const status = next ? 'active' : 'inactive'
      await updateStore(m.id, { status })
      setPaginated((prev) =>
        prev
          ? { ...prev, data: prev.data.map((s) => (s.id === m.id ? { ...s, status } : s)) }
          : prev
      )
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }, [togglingId])

  const columns: Column<Store>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'address',
        label: 'Adresse',
        sortable: true,
        render: (v) => (
          <span className="max-w-[220px] truncate text-gray-600">
            {v ? String(v) : '—'}
          </span>
        ),
      },
      {
        key: 'phone',
        label: 'Tél.',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'is_purchasing_center',
        label: 'Central',
        render: (v) =>
          v ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Oui
            </span>
          ) : (
            <span className="text-gray-400">Non</span>
          ),
      },
      {
        key: 'status',
        label: 'Statut',
        sortable: true,
        render: (_v, item) => (
          <ToggleSwitch
            checked={item.status === 'active'}
            disabled={togglingId === item.id}
            onChange={(next) => void handleToggleStatus(item, next)}
            label="Activer/désactiver ce magasin"
          />
        ),
      },
    ],
    [togglingId, handleToggleStatus]
  )

  const actions: Action<Store>[] = useMemo(
    () => [
      {
        label: 'Voir le détail',
        icon: Eye,
        variant: 'primary',
        onClick: (m) => navigate(`/stores/${m.id}`),
      },
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (m) => {
          setModalStore(m)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (m) => void handleDelete(m),
      },
    ],
    [navigate, handleDelete]
  )

  const statusSelect = (
    <select
      id="filter-status"
      value={statusFilter}
      onChange={(e) => {
        setStatusFilter(e.target.value)
        setPage(1)
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
      aria-label="Filtrer par statut"
    >
      <option value="">Tous les statuts</option>
      {STORE_STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Magasins</h1>
          <p className="mt-1 text-gray-600">
            Liste des points de vente — détail sur la fiche, création et
            modification dans une fenêtre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalStore(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouveau magasin
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

      <DataTable<Store>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="magasins"
        searchable
        searchPlaceholder="Rechercher un magasin…"
        customFilters={statusSelect}
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
            Aucun magasin.{' '}
            <button
              type="button"
              onClick={() => {
                setModalStore(null)
                setModalOpen(true)
              }}
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Créer un magasin
            </button>
          </span>
        }
        getRowId={(m) => m.id}
      />

      <StoreCreateModal
        open={modalOpen}
        store={modalStore}
        onClose={() => {
          setModalOpen(false)
          setModalStore(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}
