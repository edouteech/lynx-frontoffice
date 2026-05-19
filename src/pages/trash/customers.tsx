import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchCustomers, restoreCustomer } from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Customer } from '../../types/api'

export default function TrashCustomers() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Customer[]
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
      const res = await fetchCustomers(page, undefined, true)
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
    async (c: Customer) => {
      if (!window.confirm(`Restaurer le client « ${c.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restoreCustomer(c.id)
        setSuccess(`Le client « ${c.name} » a été restauré avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
  )

  const columns: Column<Customer>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'phone',
        label: 'Téléphone',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'tax_id',
        label: 'IFU',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'aib',
        label: 'AIB',
        render: (v) =>
          v ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Oui
            </span>
          ) : (
            <span className="text-gray-400">Non</span>
          ),
      },
    ],
    []
  )

  const actions: Action<Customer>[] = useMemo(
    () => [
      {
        label: 'Restaurer',
        icon: RotateCcw,
        variant: 'primary',
        onClick: (c) => void handleRestore(c),
      },
    ],
    [handleRestore]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - Clients</h1>
        <p className="mt-1 text-gray-600">
          Liste des clients supprimés. Vous pouvez les restaurer pour les rendre à nouveau actifs.
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

      <DataTable<Customer>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="clients_supprimes"
        searchable
        searchPlaceholder="Rechercher un client supprimé…"
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
        emptyMessage="Aucun client dans la corbeille."
        getRowId={(c) => c.id}
      />
    </div>
  )
}
