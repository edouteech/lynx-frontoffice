import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import {
  deletePaymentMethod,
  fetchPaymentMethod,
  fetchPaymentMethods,
} from '../../api/paymentMethods'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PaymentMethod } from '../../types/api'
import { PaymentMethodCreateModal } from './create'

export default function PaymentMethodsIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
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

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchPaymentMethods(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }, [page])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPaymentMethods(page)
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
    async (pm: PaymentMethod) => {
      if (!window.confirm(`Supprimer le moyen « ${pm.name} » ?`)) return
      setError(null)
      try {
        await deletePaymentMethod(pm.id)
        const res = await fetchPaymentMethods(page)
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
    [page]
  )

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
    ],
    []
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

