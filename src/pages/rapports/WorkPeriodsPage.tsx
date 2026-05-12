import { useMemo, useState } from 'react'
import {
  Filter,
  Store,
  Printer,
  RotateCcw,
  Clock,
  Wallet,
  Scale,
  History
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'

/* ================= TYPES ================= */

type Row = {
  code: string
  pvd: string
  openedAt: string
  closedAt: string
  expectedCash: number
  realCash: number
  diff: number | null
  /** Champs techniques pour filtres (maquette). */
  storeId: string
  /** Date ISO (ex. 2026-04-15T10:30:00) */
  openedAtIso: string
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

export default function WorkPeriodsPage() {
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
  const [storeId, setStoreId] = useState<string>('all')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const hasFilters = storeId !== 'all' || from !== defaultFrom || to !== defaultTo

  const handleClearFilters = () => {
    setStoreId('all')
    setFrom(defaultFrom)
    setTo(defaultTo)
    setAppliedStoreId('all')
    setAppliedFrom(defaultFrom)
    setAppliedTo(defaultTo)
  }

  const [appliedStoreId, setAppliedStoreId] = useState<string>('all')
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(defaultTo)

  const stores = [
    { id: 'all', name: 'Tous les magasins' },
    { id: '1', name: 'ALUTRACO' },
    { id: '2', name: 'PLOMBERIES' },
    { id: '3', name: 'RESTAURANT' },
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
    const mk = (openDaysAgo: number, closeDaysAgo: number) => {
      const opened = new Date(now)
      opened.setDate(now.getDate() - openDaysAgo)
      const closed = new Date(now)
      closed.setDate(now.getDate() - closeDaysAgo)
      return {
        openedAtIso: opened.toISOString().slice(0, 19),
        openedAt: fmt.format(opened).replace(',', ''),
        closedAt: fmt.format(closed).replace(',', ''),
      }
    }

    const a = mk(1, 0)
    const b = mk(3, 3)
    const c = mk(5, 5)
    const d = mk(7, 7)
    const e = mk(10, 10)

    return [
      {
        code: 'WP-152-0265',
        pvd: 'Caisse 2 AL (ALUTRACO)',
        openedAt: a.openedAt,
        closedAt: a.closedAt,
        expectedCash: 0,
        realCash: 0,
        diff: null,
        storeId: '1',
        openedAtIso: a.openedAtIso,
      },
      {
        code: 'WP-152-0266',
        pvd: 'Caisse 4 PL (PLOMBERIES)',
        openedAt: b.openedAt,
        closedAt: b.closedAt,
        expectedCash: 110000,
        realCash: 110000,
        diff: null,
        storeId: '2',
        openedAtIso: b.openedAtIso,
      },
      {
        code: 'WP-152-0267',
        pvd: 'Caisse 1 RE (RESTAURANT)',
        openedAt: c.openedAt,
        closedAt: c.closedAt,
        expectedCash: 408000,
        realCash: 395000,
        diff: -13000,
        storeId: '3',
        openedAtIso: c.openedAtIso,
      },
      {
        code: 'WP-152-0268',
        pvd: 'Caisse 2 AL (ALUTRACO)',
        openedAt: d.openedAt,
        closedAt: d.closedAt,
        expectedCash: 704290,
        realCash: 0,
        diff: -704290,
        storeId: '1',
        openedAtIso: d.openedAtIso,
      },
      {
        code: 'WP-152-0269',
        pvd: 'Caisse 1 RE (RESTAURANT)',
        openedAt: e.openedAt,
        closedAt: e.closedAt,
        expectedCash: 58200,
        realCash: 60000,
        diff: 1800,
        storeId: '3',
        openedAtIso: e.openedAtIso,
      },
    ]
  }, [])

  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    const fromTs = appliedFrom ? new Date(appliedFrom).getTime() : Number.NEGATIVE_INFINITY
    const toTs = appliedTo ? new Date(appliedTo).getTime() : Number.POSITIVE_INFINITY

    return rows.filter((r) => {
      if (appliedStoreId !== 'all' && r.storeId !== appliedStoreId) return false
      const openedTs = new Date(r.openedAtIso).getTime()
      return openedTs >= fromTs && openedTs <= toTs
    })
  }, [appliedFrom, appliedStoreId, appliedTo, rows])

  /* ================= KPI CALCULATIONS ================= */
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      expected: acc.expected + r.expectedCash,
      real: acc.real + r.realCash,
      diff: acc.diff + (r.diff ?? 0),
      count: acc.count + 1
    }), { expected: 0, real: 0, diff: 0, count: 0 })
  }, [filteredRows])

  /* ================= COLUMNS ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'ID Session',
        sortable: true,
        nowrap: true,
        render: (v) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <History className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-900">{String(v)}</span>
          </div>
        ),
      },
      {
        key: 'pvd',
        label: 'Caisse / Point de vente',
        sortable: true,
        render: (v) => <span className="font-medium text-gray-700">{String(v)}</span>
      },
      { 
        key: 'openedAt', 
        label: "Ouverture", 
        sortable: true,
        render: (v) => <span className="text-gray-500 text-sm whitespace-pre-wrap">{String(v)}</span>
      },
      { 
        key: 'closedAt', 
        label: 'Fermeture', 
        sortable: true,
        render: (v) => <span className="text-gray-500 text-sm whitespace-pre-wrap">{String(v)}</span>
      },
      {
        key: 'expectedCash',
        label: 'Prévu',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-medium text-gray-600">{formatFcfa(Number(v))}</span>,
      },
      {
        key: 'realCash',
        label: 'Réel',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-bold text-gray-900">{formatFcfa(Number(v))}</span>,
      },
      {
        key: 'diff',
        label: 'Différence',
        sortable: true,
        align: 'right',
        render: (v) => {
          const val = v as number | null
          if (val === null) return <span className="text-gray-400">---</span>
          const isNeg = val < 0
          const isPos = val > 0
          return (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
              isNeg ? "bg-red-50 text-red-700" : isPos ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"
            }`}>
              {isPos ? "+" : ""}{formatFcfa(val)}
            </span>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Périodes de travail</h1>
        <p className="mt-1 text-sm text-gray-500">Gestion des sessions de caisse et audit des écarts</p>
      </header>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
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

          <label className="lg:col-span-4">
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
          label="Sessions"
          value={<span className="text-2xl font-bold text-gray-900">{formatNumber(totals.count)}</span>}
          sub={<span className="text-xs text-gray-500">Périodes clôturées</span>}
          icon={Clock}
          accent="bg-blue-600"
        />
        <KpiCard
          label="Encaissement Réel"
          value={<span className="text-2xl font-bold text-gray-900">{formatFcfa(totals.real)}</span>}
          sub={<span className="text-xs text-gray-500">Total espèces</span>}
          icon={Wallet}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Écart Global"
          value={<span className={`text-2xl font-bold ${totals.diff < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {totals.diff > 0 ? "+" : ""}{formatFcfa(totals.diff)}
          </span>}
          icon={Scale}
          accent={totals.diff < 0 ? "bg-red-600" : "bg-emerald-600"}
        />
        <KpiCard
          label="Prévu Total"
          value={<span className="text-xl font-bold text-gray-900">{formatFcfa(totals.expected)}</span>}
          icon={History}
          accent="bg-violet-600"
        />
      </div>

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="Audit des sessions de travail"
          searchable
          searchPlaceholder="Rechercher une session..."
          exportFilename="periodes-de-travail"
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

