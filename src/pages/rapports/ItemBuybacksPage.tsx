import { useMemo, useState } from 'react'
import {
  Filter,
  Store,
  UserRound,
  Printer,
  RotateCcw,
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'

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

function formatInteger(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
    value
  )
}

function toDateTimeLocalValue(d: Date, time: string = '00:00') {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`
}

export default function ItemBuybacksPage() {
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

  // Draft (UI) filters
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [storeId, setStoreId] = useState<string>('all')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const hasFilters =
    employeeId !== 'all' ||
    storeId !== 'all' ||
    from !== defaultFrom ||
    to !== defaultTo

  const handleClearFilters = () => {
    setEmployeeId('all')
    setStoreId('all')
    setFrom(defaultFrom)
    setTo(defaultTo)
    // Also reset applied filters to sync UI
    setAppliedEmployeeId('all')
    setAppliedStoreId('all')
    setAppliedFrom(defaultFrom)
    setAppliedTo(defaultTo)
  }

  // Applied filters (used by the table)
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

  const rows: Row[] = useMemo(() => {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const make = (offsetDays: number) => {
      const d = new Date(now)
      d.setDate(now.getDate() - offsetDays)
      const soldAt = d.toISOString().slice(0, 19)
      return { soldAt, label: `${fmt.format(d).replace(',', '')}` }
    }
    const d1 = make(1)
    const d2 = make(3)
    const d3 = make(7)
    const d4 = make(10)
    const d5 = make(15)
    const d6 = make(22)
    return [
      {
        code: '249-0380',
        cashier: 'PROPRIETAIRE',
        waiter: '-',
        date: d1.label,
        type: "Rachats d'articles",
        totalHT: -500,
        totalTTC: -500,
        reduction: 0,
        employeeId: '1',
        storeId: '1',
        soldAt: d1.soldAt,
      },
      {
        code: '249-0381',
        cashier: 'PROPRIETAIRE',
        waiter: '-',
        date: d2.label,
        type: "Rachats d'articles",
        totalHT: -31_800,
        totalTTC: -31_800,
        reduction: 0,
        employeeId: '1',
        storeId: '2',
        soldAt: d2.soldAt,
      },
      {
        code: '249-0382',
        cashier: 'Yousra',
        waiter: '-',
        date: d3.label,
        type: "Rachats d'articles",
        totalHT: -36_375,
        totalTTC: -37_900,
        reduction: 0,
        employeeId: '2',
        storeId: '3',
        soldAt: d3.soldAt,
      },
      {
        code: '249-0383',
        cashier: 'PROPRIETAIRE',
        waiter: '-',
        date: d4.label,
        type: "Rachats d'articles",
        totalHT: -33_000,
        totalTTC: -33_000,
        reduction: 0,
        employeeId: '1',
        storeId: '1',
        soldAt: d4.soldAt,
      },
      {
        code: '249-0384',
        cashier: 'Yousra',
        waiter: '-',
        date: d5.label,
        type: "Rachats d'articles",
        totalHT: -130_000,
        totalTTC: -130_000,
        reduction: 0,
        employeeId: '2',
        storeId: '2',
        soldAt: d5.soldAt,
      },
      {
        code: '249-0385',
        cashier: 'PROPRIETAIRE',
        waiter: '-',
        date: d6.label,
        type: "Rachats d'articles",
        totalHT: -7_627,
        totalTTC: -9_000,
        reduction: 0,
        employeeId: '1',
        storeId: '3',
        soldAt: d6.soldAt,
      },
    ]
  }, [])

  const filteredRows = useMemo(() => {
    const fromTs = appliedFrom
      ? new Date(appliedFrom).getTime()
      : Number.NEGATIVE_INFINITY
    const toTs = appliedTo ? new Date(appliedTo).getTime() : Number.POSITIVE_INFINITY

    return rows.filter((r) => {
      if (appliedEmployeeId !== 'all' && r.employeeId !== appliedEmployeeId)
        return false
      if (appliedStoreId !== 'all' && r.storeId !== appliedStoreId) return false
      const soldTs = new Date(r.soldAt).getTime()
      if (Number.isNaN(soldTs)) return true
      return soldTs >= fromTs && soldTs <= toTs
    })
  }, [appliedEmployeeId, appliedFrom, appliedStoreId, appliedTo, rows])

  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'code',
        label: 'Code Facture',
        sortable: true,
        nowrap: true,
        render: (v) => (
          <span className="font-semibold text-[#2563EB]">
            {String(v ?? '')}
          </span>
        ),
      },
      { key: 'cashier', label: 'Caissier(s)', sortable: true },
      { key: 'waiter', label: 'Serveur(s)', sortable: true },
      { key: 'date', label: 'Date', sortable: true, nowrap: true },
      { key: 'type', label: 'Type' },
      {
        key: 'totalHT',
        label: 'Total HT',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: 'totalTTC',
        label: 'Total TTC',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: 'reduction',
        label: 'Reduction',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Liste rachats d’article
        </h1>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Les employés
            </div>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
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
                setFrom(f)
                setTo(t)
              }}
            />
          </div>

          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Les magasins
            </div>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="lg:col-span-2 flex gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAppliedEmployeeId(employeeId)
                setAppliedStoreId(storeId)
                setAppliedFrom(from)
                setAppliedTo(to)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 hover:bg-[#2563EB] active:scale-95 transition-all"
              aria-label="Filtrer"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="La liste des Rachats"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="rachats-articles"
          customFilters={
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              aria-label="Imprimer"
              title="Imprimer"
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

