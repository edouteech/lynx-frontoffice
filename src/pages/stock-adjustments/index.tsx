import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deleteStockAdjustment, fetchStockAdjustments } from '../../api/stockAdjustments'
import { getApiErrorMessage } from '../../lib/apiError'
import type { StockAdjustment } from '../../types/api'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  applied:   { label: 'Appliqué',  className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',   className: 'bg-red-100 text-red-600' },
}

export default function StockAdjustmentsIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: StockAdjustment[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStockAdjustments(p)
      setPaginated({ data: res.data, current_page: res.current_page, last_page: res.last_page, total: res.total })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page) }, [page, load])

  const handleDelete = useCallback(async (a: StockAdjustment) => {
    if (!window.confirm(`Supprimer l'ajustement #${String(a.id).padStart(4, '0')} ?`)) return
    try {
      await deleteStockAdjustment(a.id)
      void load(page)
    } catch (err) { setError(getApiErrorMessage(err)) }
  }, [page, load])

  const columns: Column<StockAdjustment>[] = useMemo(() => [
    {
      key: 'id',
      label: 'N°',
      render: v => <span className="font-mono font-semibold text-gray-700">#{String(v).padStart(4, '0')}</span>,
    },
    {
      key: 'store',
      label: 'Magasin',
      render: (_, row) => <span className="font-medium text-gray-800">{row.store?.name ?? '—'}</span>,
    },
    {
      key: 'adjustment_date',
      label: 'Date',
      render: v => v ? new Date(String(v)).toLocaleDateString('fr-FR') : <span className="text-gray-400">—</span>,
    },
    {
      key: 'items_count',
      label: 'Articles',
      render: v => <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{String(v ?? 0)}</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: v => {
        const s = STATUS_LABELS[String(v)] ?? STATUS_LABELS.draft
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
      },
    },
    {
      key: 'note',
      label: 'Note',
      render: v => v ? <span className="max-w-xs truncate text-gray-500">{String(v)}</span> : <span className="text-gray-400">—</span>,
    },
  ], [])

  const actions: Action<StockAdjustment>[] = useMemo(() => [
    {
      label: 'Voir / Modifier',
      icon: Eye,
      variant: 'primary',
      onClick: a => navigate(`/stock-adjustments/${a.id}/edit`),
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: a => void handleDelete(a),
    },
  ], [navigate, handleDelete])

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ajustements de stock</h1>
          <p className="mt-1 text-gray-600">Ajoutez ou retirez du stock directement dans un magasin.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/stock-adjustments/create')}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvel ajustement
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <DataTable<StockAdjustment>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        searchable
        searchPlaceholder="Rechercher un ajustement…"
        serverPagination={
          paginated
            ? { currentPage: paginated.current_page, lastPage: paginated.last_page, total: paginated.total, onPageChange: p => setPage(p), disabled: loading }
            : undefined
        }
        emptyMessage="Aucun ajustement de stock"
      />
    </div>
  )
}
