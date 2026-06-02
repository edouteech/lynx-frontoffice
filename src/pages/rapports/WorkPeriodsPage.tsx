import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Filter,
  Store,
  Printer,
  RotateCcw,
  Clock,
  Wallet,
  Scale,
  History,
  Loader2
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { fetchCashRegisters } from '../../api/cashRegisters'
import { fetchCashRegisterSessions } from '../../api/cashRegisterSessions'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegisterSession, Store as StoreType } from '../../types/api'

/* ================= TYPES ================= */

type Row = CashRegisterSession & {
  cash_register_name: string
  store_name: string
  store_id: number
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

  /* ================= DATA ================= */
  const [stores, setStores] = useState<StoreType[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch stores
      const storesRes = await fetchStores(1)
      setStores(storesRes.data)

      // Fetch all cash registers
      const cashRegistersRes = await fetchCashRegisters(1, undefined, appliedStoreId !== 'all' ? Number(appliedStoreId) : undefined)
      const cashRegisters = cashRegistersRes.data

      // Fetch sessions for each cash register
      const allSessions: Row[] = []
      for (const register of cashRegisters) {
        try {
          const sessions = await fetchCashRegisterSessions(register.id)
          const sessionsWithNames = sessions.map((session) => ({
            ...session,
            cash_register_name: register.name,
            store_name: register.store?.name ?? 'Inconnu',
            store_id: register.store_id,
          }))
          allSessions.push(...sessionsWithNames)
        } catch (e) {
          console.error(`Error fetching sessions for register ${register.id}:`, e)
        }
      }

      setRows(allSessions)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [appliedStoreId])

  useEffect(() => {
    void load()
  }, [load])

  /* ================= FILTER LOGIC ================= */
  const filteredRows = useMemo(() => {
    const fromTs = appliedFrom ? new Date(appliedFrom).getTime() : Number.NEGATIVE_INFINITY
    const toTs = appliedTo ? new Date(appliedTo).getTime() : Number.POSITIVE_INFINITY

    return rows.filter((r) => {
      if (appliedStoreId !== 'all' && r.store_id !== Number(appliedStoreId)) return false
      const openedTs = new Date(r.opened_at).getTime()
      return openedTs >= fromTs && openedTs <= toTs
    })
  }, [appliedFrom, appliedStoreId, appliedTo, rows])

  /* ================= KPI CALCULATIONS ================= */
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      expected: acc.expected + (r.expected_closing_balance ?? 0),
      real: acc.real + (r.closing_balance ?? 0),
      diff: acc.diff + (r.difference ?? 0),
      count: acc.count + 1
    }), { expected: 0, real: 0, diff: 0, count: 0 })
  }, [filteredRows])

  /* ================= COLUMNS ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'id',
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
        key: 'cash_register_name',
        label: 'Caisse',
        sortable: true,
        render: (v) => <span className="font-medium text-gray-700">{String(v)}</span>
      },
      {
        key: 'store_name',
        label: 'Magasin',
        sortable: true,
        render: (v) => <span className="text-gray-600 text-sm">{String(v)}</span>
      },
      {
        key: 'opened_at',
        label: "Ouverture",
        sortable: true,
        render: (v) => <span className="text-gray-500 text-sm whitespace-pre-wrap">{new Date(v as string).toLocaleString('fr-FR')}</span>
      },
      {
        key: 'closed_at',
        label: 'Fermeture',
        sortable: true,
        render: (v) => {
          if (!v) return <span className="text-gray-400 text-sm">Ouverte</span>
          return <span className="text-gray-500 text-sm whitespace-pre-wrap">{new Date(v as string).toLocaleString('fr-FR')}</span>
        }
      },
      {
        key: 'expected_closing_balance',
        label: 'Prévu',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-medium text-gray-600">{formatFcfa(Number(v ?? 0))}</span>,
      },
      {
        key: 'closing_balance',
        label: 'Réel',
        sortable: true,
        align: 'right',
        render: (v) => {
          if (v === null) return <span className="text-gray-400">---</span>
          return <span className="font-bold text-gray-900">{formatFcfa(Number(v))}</span>
        }
      },
      {
        key: 'difference',
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
                <option value="all">Tous les magasins</option>
                {stores.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
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
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">{error}</div>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : (
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
            getRowId={(r) => String(r.id)}
          />
        )}
      </div>
    </div>
  )
}

