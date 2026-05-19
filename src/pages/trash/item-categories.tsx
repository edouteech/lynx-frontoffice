import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchItemCategories, restoreItemCategory } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory } from '../../types/api'

export default function TrashItemCategories() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: ItemCategory[]
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
      const res = await fetchItemCategories(page, true)
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
    async (c: ItemCategory) => {
      if (!window.confirm(`Restaurer la catégorie « ${c.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restoreItemCategory(c.id)
        setSuccess(`La catégorie « ${c.name} » a été restaurée avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
  )

  const columns: Column<ItemCategory>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'color',
        label: 'Couleur',
        render: (v) =>
          v ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded border border-gray-200"
                style={{ backgroundColor: String(v) }}
              />
              <code className="text-xs text-gray-600">{String(v)}</code>
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
    ],
    []
  )

  const actions: Action<ItemCategory>[] = useMemo(
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
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - Catégories</h1>
        <p className="mt-1 text-gray-600">
          Liste des catégories supprimées. Vous pouvez les restaurer pour les rendre à nouveau actives.
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

      <DataTable<ItemCategory>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="categories_supprimees"
        searchable
        searchPlaceholder="Rechercher une catégorie supprimée…"
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
        emptyMessage="Aucune catégorie dans la corbeille."
        getRowId={(c) => c.id}
      />
    </div>
  )
}
