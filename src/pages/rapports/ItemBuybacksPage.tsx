import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  Eye,
  Filter,
  Loader2,
  RotateCcw,
  Store,
  TrendingDown,
  Undo2,
  UserRound,
} from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { fetchSales, type SalesStats } from '../../api/sales'
import { fetchStores } from '../../api/stores'
import { fetchUsers } from '../../api/users'
import { fetchSalesByEmployee } from '../../api/salesByEmployee'
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

function saleAmount(row: Sale): number {
  // row.total = valeur enregistrée en base, fiable. On ne la recalcule plus depuis
  // discount_percentage (arrondi à 2 décimales en base, faisait dériver l'affichage).
  return Number(row.total) || 0
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

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function ItemBuybacksPage() {
  const navigate = useNavigate()

  /* filters */
  const [storeId, setStoreId] = useState<string>('all')
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [from, setFrom] = useState(firstOfMonthISO() + 'T00:00')
  const [to, setTo] = useState(todayISO() + 'T23:59')

  /* applied (ne changent qu'au clic sur "Filtrer") */
  const [appliedStoreId, setAppliedStoreId] = useState<string>('all')
  const [appliedEmployeeId, setAppliedEmployeeId] = useState<string>('all')
  const [appliedFrom, setAppliedFrom] = useState(firstOfMonthISO() + 'T00:00')
  const [appliedTo, setAppliedTo] = useState(todayISO() + 'T23:59')

  /* data */
  const [sales, setSales] = useState<Sale[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'Tous les employés' },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Totaux calculés côté serveur sur l'ensemble des rachats filtrés (pas juste la page affichée). */
  const [stats, setStats] = useState<SalesStats | null>(null)

  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchStores(1).then((r) => setStores(r.data)).catch(() => { /* silent */ })
  }, [])

  // Liste des employés : union des utilisateurs de l'organisation et des noms d'opérateur
  // déjà vus sur des ventes (historique, y compris des noms qui ne correspondent plus à
  // un compte actif) — même approche que les autres rapports (ex. Ventes par articles).
  useEffect(() => {
    async function loadEmployees() {
      try {
        const [usersRes, employeesRes] = await Promise.all([
          fetchUsers(1),
          fetchSalesByEmployee(),
        ])

        const names = new Set<string>()
        usersRes.data.forEach((u) => names.add(u.name))
        employeesRes.data.forEach((e) => names.add(e.employee))

        setEmployees([
          { id: 'all', name: 'Tous les employés' },
          ...Array.from(names).sort((a, b) => a.localeCompare(b)).map((name) => ({ id: name, name })),
        ])
      } catch { /* silent */ }
    }

    void loadEmployees()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSales({
        page,
        type_facture: 'RA',
        store_id: appliedStoreId !== 'all' ? Number(appliedStoreId) : null,
        seller_name: appliedEmployeeId !== 'all' ? appliedEmployeeId : null,
        from: appliedFrom || null,
        to: appliedTo || null,
      })
      setSales(res.data)
      setLastPage(res.last_page)
      setTotal(res.total)
      setStats(res.stats ?? null)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, appliedStoreId, appliedEmployeeId, appliedFrom, appliedTo])

  useEffect(() => { void load() }, [load])

  const applyFilters = () => {
    setAppliedStoreId(storeId)
    setAppliedEmployeeId(employeeId)
    setAppliedFrom(from)
    setAppliedTo(to)
    setPage(1)
  }

  const clearFilters = () => {
    const f = firstOfMonthISO() + 'T00:00'
    const t = todayISO() + 'T23:59'
    setStoreId('all'); setEmployeeId('all'); setFrom(f); setTo(t)
    setAppliedStoreId('all'); setAppliedEmployeeId('all'); setAppliedFrom(f); setAppliedTo(t)
    setPage(1)
  }

  const hasFilters = storeId !== 'all' || employeeId !== 'all' || from !== appliedFrom || to !== appliedTo

  /* KPIs */
  const totals = useMemo(() => {
    const amount = (stats?.total_subtotal ?? 0) - (stats?.total_discount ?? 0)
    const count  = stats?.count ?? 0
    return {
      amount,
      count,
      average: count > 0 ? amount / count : 0,
    }
  }, [stats])

  /* columns */
  const columns: Column<Sale>[] = useMemo(() => [
    {
      key: 'invoice_number',
      label: 'N° Rachat',
      sortable: true,
      nowrap: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-pink-50 text-pink-600">
            <Undo2 className="h-4 w-4" />
          </div>
          <span className="font-bold text-gray-900">
            {v ? String(v) : `#${String(row.id).padStart(4, '0')}`}
          </span>
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
      key: 'seller_name',
      label: 'Opérateur',
      render: (v) => <span className="font-medium text-gray-700">{(v as string | null) ?? '-'}</span>,
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
      key: 'subtotal',
      label: 'Total',
      sortable: true,
      align: 'right',
      render: (_v, row) => <span className="font-bold text-pink-600">{fmtMoney(saleAmount(row))}</span>,
    },
  ], [])

  const tableActions: Action<Sale>[] = useMemo(() => [
    {
      label: 'Voir le détail',
      icon: Eye,
      variant: 'primary',
      onClick: (sale) => navigate(`/sales/${sale.id}/invoice`),
    },
  ], [navigate])

  return (
    <div className="space-y-6">
      <header className="mb-1">
        <h1 className="text-2xl font-semibold text-gray-900">Rachats d'articles</h1>
        <p className="mt-1 text-sm text-gray-500">Historique des rachats clients</p>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Employés</div>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </label>

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

          <div className="lg:col-span-3">
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
                title="Réinitialiser les filtres"
                aria-label="Réinitialiser les filtres"
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
          label="Total Décaissements"
          value={<span className="text-2xl font-bold text-pink-600">{fmtMoney(totals.amount)}</span>}
          icon={BadgeDollarSign}
          accent="bg-pink-600"
        />
        <KpiCard
          label="Volume Rachats"
          value={<span className="text-2xl font-bold text-gray-900">{totals.count}</span>}
          sub={<span className="text-xs text-gray-500">Opérations effectuées</span>}
          icon={TrendingDown}
          accent="bg-amber-600"
        />
        <KpiCard
          label="Panier Moyen"
          value={<span className="text-2xl font-bold text-gray-900">{fmtMoney(totals.average)}</span>}
          icon={Undo2}
          accent="bg-blue-600"
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
          title="Historique des rachats"
          searchable
          searchPlaceholder="Rechercher un n° d'opération..."
          exportFilename="rachats-articles"
          getRowId={(r) => String(r.id)}
          serverPagination={{
            currentPage: page,
            lastPage,
            total,
            onPageChange: setPage,
            disabled: loading,
          }}
        />
      )}
    </div>
  )
}
