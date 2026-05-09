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
    const d1 = make(2)
    const d2 = make(5)
    const d3 = make(8)
    const d4 = make(12)
    const d5 = make(18)

    return [
      {
        code: '249-0336',
        cashier: 'PROPRIETAIRE',
        waiter: 'PROPRIETAIRE',
        date: d1.label,
        type: 'Vente',
        totalHT: 1_515_000,
        totalTTC: 1_515_000,
        reduction: 0,
        employeeId: '1',
        storeId: '1',
        soldAt: d1.soldAt,
      },
      {
        code: '249-0337',
        cashier: 'PROPRIETAIRE',
        waiter: 'PROPRIETAIRE',
        date: d2.label,
        type: 'Vente',
        totalHT: 161_016,
        totalTTC: 190_000,
        reduction: 0,
        employeeId: '1',
        storeId: '2',
        soldAt: d2.soldAt,
      },
      {
        code: '249-0338',
        cashier: 'PROPRIETAIRE',
        waiter: 'PROPRIETAIRE',
        date: d3.label,
        type: 'Vente',
        totalHT: 1_694,
        totalTTC: 2_000,
        reduction: 0,
        employeeId: '2',
        storeId: '3',
        soldAt: d3.soldAt,
      },
      {
        code: '249-0339',
        cashier: 'PROPRIETAIRE',
        waiter: 'PROPRIETAIRE',
        date: d4.label,
        type: 'Vente',
        totalHT: 825_000,
        totalTTC: 825_000,
        reduction: 0,
        employeeId: '2',
        storeId: '1',
        soldAt: d4.soldAt,
      },
      {
        code: '249-0340',
        cashier: 'PROPRIETAIRE',
        waiter: 'PROPRIETAIRE',
        date: d5.label,
        type: 'Vente',
        totalHT: 534_600,
        totalTTC: 534_600,
        reduction: 5_400,
        employeeId: '1',
        storeId: '2',
        soldAt: d5.soldAt,
      },
    ]
  }, [])

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

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Facture des ventes
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
          title="La liste des reçus"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="factures-ventes"
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

