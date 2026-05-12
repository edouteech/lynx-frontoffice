import { useMemo, useState } from 'react'
import {
  Filter,
  Store,
  UserRound,
  Printer,
  RotateCcw,
  FileText,
  BadgeDollarSign,
  TrendingUp,
  Tag
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'

/* ================= TYPES ================= */

type Row = {
  code: string
  cashier: string
  waiter: string
  date: string
  type: string
  totalHT: number
  totalTTC: number
  reduction: number
  /** Champs techniques pour filtres (maquette). */
  employeeId: string
  storeId: string
  /** Date ISO (ex. 2026-04-15T10:30:00) */
  soldAt: string
}

/* ================= FORMAT UTILS ================= */

function formatFcfa(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('XOF', 'FCFA')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)
}

function toDateTimeLocalValue(d: Date, time: string = '00:00') {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`
}

/* ================= KPI CARD ================= */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  tooltip?: string;
}) {
  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md"
      title={tooltip}
    >
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10 ${accent} transition-transform group-hover:scale-110`} />
      
      <div className="flex items-center gap-3 mb-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent} shadow-inner`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</p>
      </div>

      <div className="mt-2 text-gray-900">
        {value}
      </div>
      {sub && <div className="mt-2 border-t border-gray-50 pt-2">{sub}</div>}
    </div>
  );
}

/* ================= PAGE ================= */

export default function SalesInvoicesPage() {
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    return toDateTimeLocalValue(d)
  }, [])
  const defaultTo = useMemo(() => {
    const d = new Date()
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return toDateTimeLocalValue(lastDay, '23:59')
  }, [])

  /* ================= FILTERS ================= */
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [storeId, setStoreId] = useState<string>('all')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const hasFilters = employeeId !== 'all' || storeId !== 'all' || from !== defaultFrom || to !== defaultTo

  const handleClearFilters = () => {
    setEmployeeId('all')
    setStoreId('all')
    setFrom(defaultFrom)
    setTo(defaultTo)
    setAppliedEmployeeId('all')
    setAppliedStoreId('all')
    setAppliedFrom(defaultFrom)
    setAppliedTo(defaultTo)
  }

  const [appliedEmployeeId, setAppliedEmployeeId] = useState<string>('all')
  const [appliedStoreId, setAppliedStoreId] = useState<string>('all')
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(defaultTo)

  const employees = [
    { id: 'all', name: 'Tous les employés' },
    { id: '1', name: 'PROPRIETAIRE' },
    { id: '2', name: 'Yousra' },
  ]

  const stores = [
    { id: 'all', name: 'Tous les magasins' },
    { id: '1', name: 'Magasin Centre-ville' },
    { id: '2', name: 'Magasin Nord' },
    { id: '3', name: 'Magasin Sud' },
  ]

  /* ================= MOCK DATA ================= */
  const rows: Row[] = useMemo(() => {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    const make = (offsetDays: number) => {
      const d = new Date(now)
      d.setDate(now.getDate() - offsetDays)
      const soldAt = d.toISOString().slice(0, 19)
      return { soldAt, label: `${fmt.format(d).replace(',', '')}` }
    }
    
    return [
      {
        code: 'INV-249-0336',
        cashier: 'Alex T.',
        waiter: '---',
        date: make(1).label,
        type: 'Vente Directe',
        totalHT: 1515000,
        totalTTC: 1515000,
        reduction: 0,
        employeeId: '1',
        storeId: '1',
        soldAt: make(1).soldAt,
      },
      {
        code: 'INV-249-0337',
        cashier: 'Alex T.',
        waiter: 'Yousra',
        date: make(2).label,
        type: 'Commande Table',
        totalHT: 161016,
        totalTTC: 190000,
        reduction: 0,
        employeeId: '1',
        storeId: '2',
        soldAt: make(2).soldAt,
      },
      {
        code: 'INV-249-0338',
        cashier: 'Yousra',
        waiter: 'Yousra',
        date: make(3).label,
        type: 'Vente Directe',
        totalHT: 1694,
        totalTTC: 2000,
        reduction: 0,
        employeeId: '2',
        storeId: '3',
        soldAt: make(3).soldAt,
      },
      {
        code: 'INV-249-0339',
        cashier: 'Yousra',
        waiter: '---',
        date: make(4).label,
        type: 'Vente Directe',
        totalHT: 825000,
        totalTTC: 825000,
        reduction: 0,
        employeeId: '2',
        storeId: '1',
        soldAt: make(4).soldAt,
      },
      {
        code: 'INV-249-0340',
        cashier: 'Alex T.',
        waiter: 'Alex T.',
        date: make(5).label,
        type: 'A Emporter',
        totalHT: 534600,
        totalTTC: 534600,
        reduction: 5400,
        employeeId: '1',
        storeId: '2',
        soldAt: make(5).soldAt,
      },
    ]
  }, [])

  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    const fromTs = appliedFrom ? new Date(appliedFrom).getTime() : Number.NEGATIVE_INFINITY
    const toTs = appliedTo ? new Date(appliedTo).getTime() : Number.POSITIVE_INFINITY

    return rows.filter((r) => {
      if (appliedEmployeeId !== 'all' && r.employeeId !== appliedEmployeeId) return false
      if (appliedStoreId !== 'all' && r.storeId !== appliedStoreId) return false
      const soldTs = new Date(r.soldAt).getTime()
      return soldTs >= fromTs && soldTs <= toTs
    })
  }, [appliedEmployeeId, appliedFrom, appliedStoreId, appliedTo, rows])

  /* ================= KPI CALCULATIONS ================= */
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      ttc: acc.ttc + r.totalTTC,
      ht: acc.ht + r.totalHT,
      reduction: acc.reduction + r.reduction,
      count: acc.count + 1
    }), { ttc: 0, ht: 0, reduction: 0, count: 0 })
  }, [filteredRows])

  /* ================= COLUMNS ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'N° Facture',
        sortable: true,
        nowrap: true,
        render: (v) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-900">{String(v)}</span>
          </div>
        ),
      },
      { 
        key: 'cashier', 
        label: 'Caissier', 
        sortable: true,
        render: (v) => <span className="font-medium text-gray-700">{String(v)}</span>
      },
      { 
        key: 'date', 
        label: 'Date & Heure', 
        sortable: true, 
        nowrap: true,
        render: (v) => <span className="text-gray-500 text-sm">{String(v)}</span>
      },
      { 
        key: 'type', 
        label: 'Type',
        render: (v) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {String(v)}
          </span>
        )
      },
      {
        key: 'totalHT',
        label: 'Total HT',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-medium text-gray-600">{formatFcfa(Number(v))}</span>,
      },
      {
        key: 'totalTTC',
        label: 'Total TTC',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-bold text-blue-700">{formatFcfa(Number(v))}</span>,
      },
      {
        key: 'reduction',
        label: 'Réduction',
        sortable: true,
        align: 'right',
        render: (v) => (
          <span className={`font-medium ${Number(v) > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {Number(v) > 0 ? `-${formatFcfa(Number(v))}` : "---"}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Historique des factures</h1>
        <p className="mt-1 text-sm text-gray-500">Consultation et gestion des reçus de ventes</p>
      </header>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Caissier</div>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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

          <div className="lg:col-span-4">
            <div className="mb-1 text-xs font-semibold text-gray-600">Période</div>
            <DateRangePicker
              from={from}
              to={to}
              onRangeChange={(f, t) => {
                setFrom(f);
                setTo(t);
              }}
            />
          </div>

          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Magasin</div>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </label>

          <div className="lg:col-span-2 flex gap-2">
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                setAppliedEmployeeId(employeeId)
                setAppliedStoreId(storeId)
                setAppliedFrom(from)
                setAppliedTo(to)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total TTC"
          value={<span className="text-2xl font-bold text-gray-900">{formatFcfa(totals.ttc)}</span>}
          sub={<span className="text-xs text-gray-500">HT: {formatFcfa(totals.ht)}</span>}
          icon={BadgeDollarSign}
          accent="bg-blue-600"
        />
        <KpiCard
          label="Volume"
          value={<span className="text-2xl font-bold text-gray-900">{formatNumber(totals.count)}</span>}
          sub={<span className="text-xs text-gray-500">Factures émises</span>}
          icon={TrendingUp}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Remises"
          value={<span className="text-2xl font-bold text-amber-600">-{formatFcfa(totals.reduction)}</span>}
          icon={Tag}
          accent="bg-amber-600"
        />
        <KpiCard
          label="Type Dominant"
          value={<span className="text-xl font-bold text-gray-900">Vente Directe</span>}
          icon={FileText}
          accent="bg-violet-600"
        />
      </div>

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="Liste des reçus de vente"
          searchable
          searchPlaceholder="Rechercher un n° de facture..."
          exportFilename="factures-ventes"
          customFilters={
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 text-gray-500" />
              Imprimer
            </button>
          }
          getRowId={(r) => r.code}
        />
      </div>
    </div>
  )
}

