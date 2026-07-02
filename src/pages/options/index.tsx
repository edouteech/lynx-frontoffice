import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import type { Option } from '../../types/api'
import { deleteOption, fetchOptions } from '../../api/options'
import { getApiErrorMessage } from '../../lib/apiError'
import { OptionCreateModal } from './create'

export default function OptionsIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Option[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalOption, setModalOption] = useState<Option | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchOptions(page)
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
        const res = await fetchOptions(page)
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
    async (o: Option) => {
      if (!window.confirm(`Supprimer l'option « ${o.name} » ?`)) return
      setError(null)
      try {
        await deleteOption(o.id)
        await refreshList()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [refreshList]
  )

  const columns: Column<Option>[] = useMemo(
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

  const actions: Action<Option>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (o) => {
          setModalOption(o)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (o) => void handleDelete(o),
      },
    ],
    [handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Options</h1>
          <p className="mt-1 text-gray-600">
            Regroupez des produits sous des options configurables.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalOption(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle option
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

      <DataTable<Option>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="options"
        searchable
        searchPlaceholder="Rechercher une option…"
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
        emptyMessage="Aucune option"
        getRowId={(o) => o.id}
      />

      <OptionCreateModal
        open={modalOpen}
        option={modalOption}
        onClose={() => {
          setModalOpen(false)
          setModalOption(null)
        }}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}
