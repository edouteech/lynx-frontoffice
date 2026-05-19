import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchStores, restoreStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Store } from '../../types/api'

export default function TrashStores() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Store[]
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
      const res = await fetchStores(page, undefined, true)
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
    async (m: Store) => {
      if (!window.confirm(`Restaurer le magasin « ${m.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restoreStore(m.id)
        setSuccess(`Le magasin « ${m.name} » a été restauré avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
  )

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
    ],
    []
  )

  const actions: Action<Store>[] = useMemo(
    () => [
      {
        label: 'Restaurer',
        icon: RotateCcw,
        variant: 'primary',
        onClick: (m) => void handleRestore(m),
      },
    ],
    [handleRestore]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - Magasins</h1>
        <p className="mt-1 text-gray-600">
          Liste des magasins supprimés. Vous pouvez les restaurer pour les rendre à nouveau actifs.
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

      <DataTable<Store>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="magasins_supprimes"
        searchable
        searchPlaceholder="Rechercher un magasin supprimé…"
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
        emptyMessage="Aucun magasin dans la corbeille."
        getRowId={(m) => m.id}
      />
    </div>
  )
}
