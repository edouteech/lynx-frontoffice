import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText, Filter, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { confirmSale, deleteSale, fetchSales } from '../../api/sales'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Sale } from '../../types/api'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
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

  /* Plage de dates : `from`/`to` alimentent le sélecteur, `applied*` déclenchent le filtre.
     Tant qu'aucun filtre n'est appliqué (applied* === null), toutes les ventes sont affichées. */
  const [from, setFrom] = useState(firstOfMonthISO() + 'T00:00')
  const [to, setTo] = useState(todayISO() + 'T23:59')
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null)
  const [appliedTo, setAppliedTo] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSales({ page: p, from: appliedFrom, to: appliedTo })
      setPaginated({ data: res.data, current_page: res.current_page, last_page: res.last_page, total: res.total })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [appliedFrom, appliedTo])

  useEffect(() => { void load(page) }, [page, load])

  const applyDateFilter = useCallback(() => {
    setAppliedFrom(from)
    setAppliedTo(to)
    setPage(1)
  }, [from, to])

  const clearDateFilter = useCallback(() => {
    setAppliedFrom(null)
    setAppliedTo(null)
    setFrom(firstOfMonthISO() + 'T00:00')
    setTo(todayISO() + 'T23:59')
    setPage(1)
  }, [])

  const filterActive = appliedFrom !== null || appliedTo !== null

  const handleDelete = useCallback(async (s: Sale) => {
    const label = s.invoice_number ?? `#${String(s.id).padStart(4, '0')}`
    if (!window.confirm(`Supprimer la vente ${label} ?`)) return
    try {
      await deleteSale(s.id)
      void load(page)
    } catch (err) { setError(getApiErrorMessage(err)) }
  }, [page, load])

  const handleRetryDgi = useCallback(async (s: Sale) => {
    void Swal.fire({
      title: 'Normalisation DGI en cours…',
      text: 'Merci de patienter, la vente est envoyée à la DGI.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    })

    try {
      const updated = await confirmSale(s.id)
      void load(page)
      await Swal.fire({
        title: 'Normalisation DGI réussie',
        text: `La vente ${updated.invoice_number ?? ''} a été normalisée et confirmée.`,
        icon: 'success',
        confirmButtonColor: '#0F2E4A',
      })
    } catch (err) {
      await Swal.fire({
        title: 'Échec de la normalisation DGI',
        text: getApiErrorMessage(err),
        icon: 'error',
        confirmButtonColor: '#0F2E4A',
      })
    }
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
      render: (v, row) => {
        const s = STATUS_LABELS[String(v)] ?? STATUS_LABELS.draft
        return (
          <div className="flex flex-wrap items-center gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
            {row.dgi_status === 'failed' && (
              <span
                className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
                title={row.dgi_error ?? 'Échec de la normalisation DGI'}
              >
                Échec DGI
              </span>
            )}
          </div>
        )
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
      label: 'Réessayer DGI',
      icon: RefreshCw,
      onClick: s => void handleRetryDgi(s),
      show: s => s.status === 'draft' && s.dgi_status === 'failed',
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: s => void handleDelete(s),
    },
  ], [navigate, handleDelete, handleRetryDgi])

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

      {/* Filtre par plage de dates */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className="mb-1 text-xs font-semibold text-gray-600">Période</div>
            <DateRangePicker
              from={from}
              to={to}
              onRangeChange={(f, t) => { setFrom(f); setTo(t) }}
            />
          </div>
          <div className="flex gap-2">
            {filterActive && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </button>
            )}
            <button
              type="button"
              onClick={applyDateFilter}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

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
