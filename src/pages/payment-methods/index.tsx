import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import {
  deletePaymentMethod,
  fetchPaymentMethod,
  fetchPaymentMethods,
  updatePaymentMethod,
} from '../../api/paymentMethods'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PaymentMethod, Store } from '../../types/api'
import { PaymentMethodCreateModal } from './create'

export default function PaymentMethodsIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [stores, setStores] = useState<Store[]>([])
  const [paginated, setPaginated] = useState<{
    data: PaymentMethod[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPaymentMethod, setModalPaymentMethod] =
    useState<PaymentMethod | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    fetchStores(1)
      .then((res) => setStores(res.data))
      .catch(() => {})
  }, [])

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchPaymentMethods(page, undefined, selectedStoreId || undefined)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }, [page, selectedStoreId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPaymentMethods(page, undefined, selectedStoreId || undefined)
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
  }, [page, selectedStoreId])

  const handleDelete = useCallback(
    async (pm: PaymentMethod) => {
      if (!window.confirm(`Supprimer le moyen « ${pm.name} » ?`)) return
      setError(null)
      try {
        await deletePaymentMethod(pm.id)
        const res = await fetchPaymentMethods(page, undefined, selectedStoreId || undefined)
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
    [page, selectedStoreId]
  )

  const handleToggleStatus = useCallback(async (pm: PaymentMethod, next: boolean) => {
    if (togglingId !== null) return
    setError(null)
    setTogglingId(pm.id)
    try {
      const status = next ? 'active' : 'inactive'
      await updatePaymentMethod(pm.id, { status })
      setPaginated((prev) =>
        prev
          ? { ...prev, data: prev.data.map((m) => (m.id === pm.id ? { ...m, status } : m)) }
          : prev
      )
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }, [togglingId])

  const columns: Column<PaymentMethod>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'account_number',
        label: 'Numéro',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'category.name',
        label: 'Catégorie',
        sortable: true,
        render: (_v, item) =>
          item.category?.name ? (
            <span className="text-gray-700">{item.category.name}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'stores',
        label: 'Magasins',
        render: (_v, item) => {
          const names = (item.stores ?? []).map((m) => m.name)
          if (!names.length) return <span className="text-gray-400">—</span>
          return (
            <span className="max-w-[280px] truncate text-gray-700">
              {names.join(', ')}
            </span>
          )
        },
      },
      {
        key: 'status',
        label: 'Statut',
        render: (_v, item) => (
          <ToggleSwitch
            checked={item.status === 'active'}
            disabled={togglingId === item.id}
            onChange={(next) => void handleToggleStatus(item, next)}
            label="Activer/désactiver ce moyen de paiement"
          />
        ),
      },
    ],
    [togglingId, handleToggleStatus]
  )

  const actions: Action<PaymentMethod>[] = useMemo(
    () => [
      {
        label: 'Voir le détail',
        icon: Eye,
        variant: 'primary',
        onClick: (pm) => navigate(`/payment-methods/${pm.id}`),
      },
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: async (pm) => {
          setError(null)
          try {
            const full = await fetchPaymentMethod(pm.id)
            setModalPaymentMethod(full)
            setModalOpen(true)
          } catch (e) {
            setError(getApiErrorMessage(e))
          }
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (pm) => void handleDelete(pm),
      },
    ],
    [handleDelete, navigate]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Moyens de paiement
          </h1>
          <p className="mt-1 text-gray-600">
            Créez un moyen et choisissez les magasins où il est utilisable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tous les magasins</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setModalPaymentMethod(null)
              setModalOpen(true)
            }}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Nouveau moyen
          </button>
        </div>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <DataTable<PaymentMethod>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="moyens-de-paiement"
        searchable
        searchPlaceholder="Rechercher un moyen…"
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
        emptyMessage="Aucun moyen de paiement"
      />

      <PaymentMethodCreateModal
        open={modalOpen}
        paymentMethod={modalPaymentMethod}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}

