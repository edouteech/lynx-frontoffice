import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Package } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchProducts, restoreProduct } from '../../api/products'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Product } from '../../types/api'

export default function TrashItems() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Product[]
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
      const res = await fetchProducts({
        page,
        only_trashed: true,
      })
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
    async (p: Product) => {
      if (!window.confirm(`Restaurer l'article « ${p.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restoreProduct(p.id)
        setSuccess(`L'article « ${p.name} » a été restauré avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
  )

  const columns: Column<Product>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Article',
        sortable: true,
        render: (_value, p) => (
          <div className="flex items-center gap-3">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                className="h-10 w-10 shrink-0 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {p.sku && <span className="text-xs text-gray-400">SKU: {p.sku}</span>}
                {p.category && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    {p.sku && <span className="text-gray-300">·</span>}
                    {p.category.color && (
                      <span
                        className="h-2 w-2 rounded-full inline-block"
                        style={{ backgroundColor: p.category.color }}
                      />
                    )}
                    {p.category.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        render: (v) =>
          v === 'composite' ? (
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
              Composite
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
              Simple
            </span>
          ),
      },
      {
        key: 'purchase_price',
        label: 'P. Achat',
        align: 'right',
        render: (v) =>
          v != null ? (
            <span className="text-gray-700">
              {Number(v).toLocaleString('fr-FR')} <span className="text-xs text-gray-400">CFA</span>
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        key: 'selling_price',
        label: 'P. Vente',
        align: 'right',
        sortable: true,
        render: (v) => {
          const price = Number(v)
          return (
            <span className="font-semibold text-gray-900">
              {price.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">CFA</span>
            </span>
          )
        },
      },
    ],
    []
  )

  const actions: Action<Product>[] = useMemo(
    () => [
      {
        label: 'Restaurer',
        icon: RotateCcw,
        variant: 'primary',
        onClick: (p) => void handleRestore(p),
      },
    ],
    [handleRestore]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - Articles</h1>
        <p className="mt-1 text-gray-600">
          Liste des articles supprimés. Vous pouvez les restaurer pour les rendre à nouveau actifs.
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

      <DataTable<Product>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="articles_supprimes"
        searchable
        searchPlaceholder="Rechercher un article supprimé…"
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
        emptyMessage="Aucun article dans la corbeille."
        getRowId={(p) => p.id}
      />
    </div>
  )
}
