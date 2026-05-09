import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
import { deleteCashRegister, fetchCashRegisters } from '../../api/cashRegisters'
import { fetchStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegister } from '../../types/api'
import { CASH_REGISTER_STATUS_OPTIONS } from './constants'
import { CashRegisterCreateModal } from './create'

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'bg-emerald-100 text-emerald-800'
  if (s === 'inactive') return 'bg-slate-100 text-slate-800'
  return 'bg-gray-100 text-gray-700'
}

export default function CashRegistersIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [paginated, setPaginated] = useState<{
    data: CashRegister[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [storeNamesById, setStoreNamesById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCashRegister, setModalCashRegister] = useState<CashRegister | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchCashRegisters(page, statusFilter || undefined)
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
        const res = await fetchCashRegisters(page, statusFilter || undefined)
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

  useEffect(() => {
    const cashRegisters = paginated?.data ?? []
    const missingIds = Array.from(
      new Set(cashRegisters.map((c) => String(c.store_id)))
    ).filter((id) => storeNamesById[id] == null)

    if (missingIds.length === 0) return

    let cancelled = false
    async function run() {
      try {
        const pairs = await Promise.all(
          missingIds.map(async (id) => {
            const store = await fetchStore(id)
            return [String(store.id), store.name] as const
          })
        )
        if (!cancelled) {
          setStoreNamesById((prev) => {
            const next = { ...prev }
            for (const [id, storeName] of pairs) next[id] = storeName
            return next
          })
        }
      } catch {
        // Best-effort: si ça rate, on garde l'affichage #id.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [paginated?.data, storeNamesById])

  const handleDelete = useCallback(
    async (c: CashRegister) => {
      if (!window.confirm(`Supprimer la caisse « ${c.name} » ?`)) return
      setError(null)
      try {
        await deleteCashRegister(c.id)
        await refreshList()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [refreshList]
  )

  const columns: Column<CashRegister>[] = useMemo(
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
        key: 'store_id',
        label: 'Magasin',
        sortable: true,
        render: (v) => {
          const id = String(v)
          const name = storeNamesById[id]
          if (!name) {
            return <span className="text-gray-400">Chargement…</span>
          }
          return (
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">
                {name}
              </div>
            </div>
          )
        },
      },
      {
        key: 'status',
        label: 'Statut',
        sortable: true,
        render: (v) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge(
              String(v)
            )}`}
          >
            {String(v)}
          </span>
        ),
      },
    ],
    [storeNamesById]
  )

  const actions: Action<CashRegister>[] = useMemo(
    () => [
      {
        label: 'Voir le détail',
        icon: Eye,
        variant: 'primary',
        onClick: (c) => navigate(`/cash-registers/${c.id}`),
      },
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (c) => {
          setModalCashRegister(c)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (c) => void handleDelete(c),
      },
    ],
    [handleDelete, navigate]
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
      {CASH_REGISTER_STATUS_OPTIONS.map((s) => (
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
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F2E4A] shadow-sm">
              <Wallet className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-semibold text-gray-900">Caisses</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Gestion des caisses par magasin — création et modification dans une
            fenêtre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalCashRegister(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle caisse
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

      <DataTable<CashRegister>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="caisses"
        searchable
        searchPlaceholder="Rechercher une caisse…"
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
            Aucune caisse.{' '}
            <button
              type="button"
              onClick={() => {
                setModalCashRegister(null)
                setModalOpen(true)
              }}
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Créer une caisse
            </button>
          </span>
        }
        getRowId={(c) => c.id}
      />

      <CashRegisterCreateModal
        open={modalOpen}
        cashRegister={modalCashRegister}
        onClose={() => {
          setModalOpen(false)
          setModalCashRegister(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}

