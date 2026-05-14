import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  Eye,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  Store,
  Tag,
  TrendingUp,
} from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { fetchSales } from '../../api/sales'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Sale, Store as StoreType } from '../../types/api'

/* ── helpers ──────────────────────────────────────────────────────────────── */

function fmtMoney(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' CFA'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10 ${accent}`} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent} shadow-inner`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <div className="mt-2 text-gray-900">{value}</div>
      {sub && <div className="mt-2 border-t border-gray-50 pt-2">{sub}</div>}
    </div>
  )
}

/* ── status pill ──────────────────────────────────────────────────────────── */

const STATUS: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  draft:     { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function SalesInvoicesPage() {
  const navigate = useNavigate()

  /* filters */
  const [storeId, setStoreId] = useState<string>('all')
  const [status, setStatus] = useState<string>('confirmed')
  const [from, setFrom] = useState(firstOfMonthISO() + 'T00:00')
  const [to, setTo] = useState(todayISO() + 'T23:59')

  /* applied (only changes when user clicks Filtrer) */
  const [appliedStoreId, setAppliedStoreId] = useState<string>('all')
  const [appliedStatus, setAppliedStatus] = useState<string>('confirmed')
  const [appliedFrom, setAppliedFrom] = useState(firstOfMonthISO() + 'T00:00')
  const [appliedTo, setAppliedTo] = useState(todayISO() + 'T23:59')

  /* data */
  const [sales, setSales] = useState<Sale[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* load stores once */
  useEffect(() => {
    fetchStores(1).then((r) => setStores(r.data)).catch(() => { /* silent */ })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSales({
        store_id: appliedStoreId !== 'all' ? Number(appliedStoreId) : null,
        status: appliedStatus !== 'all' ? appliedStatus : null,
        from: appliedFrom || null,
        to: appliedTo || null,
      })
      setSales(res.data)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [appliedStoreId, appliedStatus, appliedFrom, appliedTo])

  useEffect(() => { void load() }, [load])

  const applyFilters = () => {
    setAppliedStoreId(storeId)
    setAppliedStatus(status)
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const clearFilters = () => {
    const f = firstOfMonthISO() + 'T00:00'
    const t = todayISO() + 'T23:59'
    setStoreId('all'); setStatus('confirmed'); setFrom(f); setTo(t)
    setAppliedStoreId('all'); setAppliedStatus('confirmed'); setAppliedFrom(f); setAppliedTo(t)
  }

  const hasFilters = storeId !== 'all' || status !== 'confirmed' || from !== appliedFrom || to !== appliedTo

  /* KPIs */
  const totals = useMemo(() => sales.reduce((acc, s) => ({
    total: acc.total + (s.subtotal ?? 0),
    count: acc.count + 1,
    discount: acc.discount + ((s.subtotal ?? 0) * ((s.discount_percentage ?? 0) / 100)),
  }), { total: 0, count: 0, discount: 0 }), [sales])

  /* columns */
  const columns: Column<Sale>[] = useMemo(() => [
    {
      key: 'id',
      label: 'N° Facture',
      sortable: true,
      nowrap: true,
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-bold text-gray-900">FAC-{String(v).padStart(6, '0')}</span>
        </div>
      ),
    },
    {
      key: 'sale_date',
      label: 'Date',
      sortable: true,
      nowrap: true,
      render: (v) => <span className="text-sm text-gray-500">{fmtDate(v as string | null)}</span>,
    },
    {
      key: 'customer_name',
      label: 'Client',
      render: (v) => <span className="text-gray-700">{(v as string | null) ?? <span className="text-gray-400">—</span>}</span>,
    },
    {
      key: 'store',
      label: 'Magasin',
      render: (v) => {
        const store = v as Sale['store']
        return <span className="text-sm text-gray-600">{store?.name ?? '—'}</span>
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (v) => {
        const s = STATUS[v as string] ?? { label: String(v), className: 'bg-gray-100 text-gray-600' }
        return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className}`}>{s.label}</span>
      },
    },
    {
      key: 'subtotal',
      label: 'Total',
      sortable: true,
      align: 'right',
      render: (v, row) => {
        const sub = (v as number | undefined) ?? 0
        const disc = sub * ((row.discount_percentage ?? 0) / 100)
        const fees = row.extra_fees ?? 0
        return <span className="font-bold text-blue-700">{fmtMoney(sub - disc + fees)}</span>
      },
    },
  ], [])

  const tableActions: Action<Sale>[] = useMemo(() => [
    {
      label: 'Voir la facture',
      icon: Eye,
      variant: 'primary',
      onClick: (sale) => navigate(`/sales/${sale.id}/invoice`),
    },
  ], [navigate])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Historique des factures</h1>
        <p className="mt-1 text-sm text-gray-500">Consultation et impression des reçus de ventes</p>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Magasin</div>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                <option value="all">Tous les magasins</option>
                {stores.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="lg:col-span-2">
            <div className="mb-1 text-xs font-semibold text-gray-600">Statut</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            >
              <option value="all">Tous les statuts</option>
              <option value="confirmed">Confirmées</option>
              <option value="draft">Brouillons</option>
              <option value="cancelled">Annulées</option>
            </select>
          </label>

          <div className="lg:col-span-4">
            <div className="mb-1 text-xs font-semibold text-gray-600">Période</div>
            <DateRangePicker
              from={from}
              to={to}
              onRangeChange={(f, t) => { setFrom(f); setTo(t) }}
            />
          </div>

          <div className="lg:col-span-3 flex gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total"
          value={<span className="text-2xl font-bold text-gray-900">{fmtMoney(totals.total)}</span>}
          icon={BadgeDollarSign}
          accent="bg-blue-600"
        />
        <KpiCard
          label="Volume"
          value={<span className="text-2xl font-bold text-gray-900">{totals.count}</span>}
          sub={<span className="text-xs text-gray-500">Factures</span>}
          icon={TrendingUp}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Remises"
          value={<span className="text-2xl font-bold text-amber-600">-{fmtMoney(totals.discount)}</span>}
          icon={Tag}
          accent="bg-amber-600"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : (
        <DataTable<Sale>
          data={sales}
          columns={columns}
          actions={tableActions}
          title="Liste des factures"
          searchable
          searchPlaceholder="Rechercher une facture..."
          exportFilename="factures-ventes"
          getRowId={(r) => String(r.id)}
        />
      )}
    </div>
  )
}
