import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import type { Favorite } from '../../types/api'
import { deleteFavorite, fetchFavorites } from '../../api/favorites'
import { getApiErrorMessage } from '../../lib/apiError'
import { FavoriteCreateModal } from './create'

export default function FavoritesIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Favorite[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFavorite, setModalFavorite] = useState<Favorite | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchFavorites(page)
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
        const res = await fetchFavorites(page)
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
    async (f: Favorite) => {
      if (!window.confirm(`Supprimer le favori « ${f.name} » ?`)) return
      setError(null)
      try {
        await deleteFavorite(f.id)
        await refreshList()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [refreshList]
  )

  const columns: Column<Favorite>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'status',
        label: 'Statut',
        sortable: true,
        render: (v) => (
          <span className="capitalize text-gray-700">{String(v)}</span>
        ),
      },
      {
        key: 'stores',
        label: 'Magasins',
        render: (_v, row) => (
          <span className="text-gray-700">
            {(row.stores ?? []).length || 0}
          </span>
        ),
      },
      {
        key: 'products',
        label: 'Produits',
        render: (_v, row) => (
          <span className="text-gray-700">
            {(row.products ?? []).length || 0}
          </span>
        ),
      },
    ],
    []
  )

  const actions: Action<Favorite>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (f) => {
          setModalFavorite(f)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (f) => void handleDelete(f),
      },
    ],
    [handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Favoris</h1>
          <p className="mt-1 text-gray-600">
            Regroupez des produits, disponibles dans un ou plusieurs magasins.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalFavorite(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouveau favori
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

      <DataTable<Favorite>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="favoris"
        searchable
        searchPlaceholder="Rechercher un favori…"
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
        emptyMessage="Aucun favori"
        getRowId={(f) => f.id}
      />

      <FavoriteCreateModal
        open={modalOpen}
        favorite={modalFavorite}
        onClose={() => {
          setModalOpen(false)
          setModalFavorite(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}

