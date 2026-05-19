import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchPaymentMethods, restorePaymentMethod } from '../../api/paymentMethods'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PaymentMethod } from '../../types/api'

export default function TrashPaymentMethods() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: PaymentMethod[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPaymentMethods(page, true)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
      setPaginated(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRestore = useCallback(
    async (pm: PaymentMethod) => {
      if (!window.confirm(`Restaurer le moyen de paiement « ${pm.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restorePaymentMethod(pm.id)
        setSuccess(`Le moyen de paiement « ${pm.name} » a été restauré avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
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
        label: 'Restaurer',
        icon: RotateCcw,
        variant: 'primary',
        onClick: (pm) => void handleRestore(pm),
      },
    ],
    [handleRestore]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - Moyens de paiement</h1>
        <p className="mt-1 text-gray-600">
          Liste des moyens de paiement supprimés. Vous pouvez les restaurer pour les rendre à nouveau actifs.
        </p>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="alert"
        >
          {success}
        </div>
      )}

      <DataTable<PaymentMethod>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="moyens_de_paiement_supprimes"
        searchable
        searchPlaceholder="Rechercher un moyen supprimé…"
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
        emptyMessage="Aucun moyen de paiement dans la corbeille."
        getRowId={(pm) => pm.id}
      />
    </div>
  )
}
