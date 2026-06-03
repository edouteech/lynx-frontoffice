import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText, Plus, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deleteSale, fetchSales } from '../../api/sales'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Sale } from '../../types/api'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
}

export default function SalesIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Sale[]
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
      const res = await fetchSales({ page: p })
      setPaginated({ data: res.data, current_page: res.current_page, last_page: res.last_page, total: res.total })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page) }, [page, load])

  const handleDelete = useCallback(async (s: Sale) => {
    const label = s.invoice_number ?? `#${String(s.id).padStart(4, '0')}`
    if (!window.confirm(`Supprimer la vente ${label} ?`)) return
    try {
      await deleteSale(s.id)
      void load(page)
    } catch (err) { setError(getApiErrorMessage(err)) }
  }, [page, load])

  const columns: Column<Sale>[] = useMemo(() => [
    {
      key: 'invoice_number',
      label: 'N° vente',
      render: (v, row) => (
        <span className="font-mono font-semibold text-gray-700">
          {(v as string) ?? `#${String(row.id).padStart(4, '0')}`}
        </span>
      ),
    },
    {
      key: 'store',
      label: 'Magasin',
      render: (_, row) => <span className="font-medium text-gray-800">{row.store?.name ?? '—'}</span>,
    },
    {
      key: 'customer',
      label: 'Client',
      render: (_, row) => row.customer?.name
        ? <span className="text-gray-700">{row.customer.name}</span>
        : <span className="text-gray-400 italic">Anonyme</span>,
    },
    {
      key: 'sale_date',
      label: 'Date',
      render: v => v ? new Date(String(v)).toLocaleDateString('fr-FR') : <span className="text-gray-400">—</span>,
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
      key: 'subtotal',
      label: 'Total',
      render: (_, row) => {
        const sub = (row as Sale & { subtotal?: number }).subtotal ?? 0
        const disc = sub * ((row.discount_percentage ?? 0) / 100)
        const total = sub - disc + (row.extra_fees ?? 0)
        return <span className="font-semibold text-gray-800">{total.toLocaleString('fr-FR')} CFA</span>
      },
    },
  ], [])

  const actions: Action<Sale>[] = useMemo(() => [
    {
      label: 'Voir / Modifier',
      icon: Eye,
      variant: 'primary',
      onClick: s => navigate(`/sales/${s.id}/edit`),
    },
    {
      label: 'Facture',
      icon: FileText,
      onClick: s => navigate(`/sales/${s.id}/invoice`),
      show: s => s.status === 'confirmed',
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: s => void handleDelete(s),
    },
  ], [navigate, handleDelete])

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ventes</h1>
          <p className="mt-1 text-gray-600">Gérez vos ventes et encaissements par magasin.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sales/create')}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle vente
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <DataTable<Sale>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        searchable
        searchPlaceholder="Rechercher une vente…"
        serverPagination={
          paginated
            ? { currentPage: paginated.current_page, lastPage: paginated.last_page, total: paginated.total, onPageChange: p => setPage(p), disabled: loading }
            : undefined
        }
        emptyMessage="Aucune vente enregistrée"
      />
    </div>
  )
}
