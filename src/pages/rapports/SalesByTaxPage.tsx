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
  taxName: string
  taxRate: number
  taxableSales: number
  taxAmount: number
  /** Champs techniques pour filtres (maquette). */
  employeeId: string
  storeId: string
  /** Date ISO (ex. 2026-04-15T10:30:00) */
  soldAt: string
}

function formatFcfa(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('XOF', 'FCFA')
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

function KpiCard({
  title,
  value,
  accent,
}: {
  title: string
  value: string
  accent: 'green' | 'cyan' | 'amber'
}) {
  const accentClasses =
    accent === 'green'
      ? 'border-l-emerald-500'
      : accent === 'cyan'
        ? 'border-l-cyan-500'
        : 'border-l-amber-500'

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${accentClasses} border-l-4`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

export default function SalesByTaxPage() {
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
    { id: '1', name: 'A. Koné' },
    { id: '2', name: 'K. Traoré' },
    { id: '3', name: 'M. Diallo' },
  ]

  const stores = [
    { id: 'all', name: 'Tous les magasins' },
    { id: '1', name: 'Magasin Centre-ville' },
    { id: '2', name: 'Magasin Nord' },
    { id: '3', name: 'Magasin Sud' },
  ]

  const rows: Row[] = useMemo(
    () => [
      {
        taxName: 'Taxe 1',
        taxRate: 0,
        taxableSales: 983_862_199,
        taxAmount: 0,
        employeeId: '1',
        storeId: '1',
        soldAt: '2026-04-05T09:15:00',
      },
      {
        taxName: 'Taxe 2',
        taxRate: 18,
        taxableSales: 45_219_237,
        taxAmount: 35_299,
        employeeId: '2',
        storeId: '2',
        soldAt: '2026-04-12T14:40:00',
      },
    ],
    []
  )

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: 'taxName', label: 'Nom de la taxe', sortable: true },
      {
        key: 'taxRate',
        label: 'Taux de taxe',
        sortable: true,
        align: 'right',
        render: (v) => `${Number(v ?? 0)}%`,
      },
      {
        key: 'taxableSales',
        label: 'Ventes taxables en FCFA',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: 'taxAmount',
        label: 'Montant de la taxe en FCFA',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
    ],
    []
  )

  const kpis = useMemo(() => {
    const ventesTaxables = rows.reduce((s, r) => s + r.taxableSales, 0)
    const ventesNonTaxables = 983_862_199
    const totalNet = 1_029_081_436
    return { ventesTaxables, ventesNonTaxables, totalNet }
  }, [rows])

  const filteredRows = useMemo(() => {
    const fromTs = appliedFrom
      ? new Date(appliedFrom).getTime()
      : Number.NEGATIVE_INFINITY
    const toTs = appliedTo
      ? new Date(appliedTo).getTime()
      : Number.POSITIVE_INFINITY

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
        <h1 className="text-2xl font-semibold text-gray-900">Ventes par taxe</h1>
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

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className=" grid  grid-cols-1 gap-6 md:grid-cols-3">
          <KpiCard
            title="Ventes taxables"
            value={formatFcfa(kpis.ventesTaxables)}
            accent="green"
          />
          <KpiCard
            title="Ventes non taxables"
            value={formatFcfa(kpis.ventesNonTaxables)}
            accent="cyan"
          />
          <KpiCard
            title="Total net des ventes"
            value={formatFcfa(kpis.totalNet)}
            accent="amber"
          />
        </div>
      </div>

      <div className="mt-6">
        <DataTable<Row>
          data={filteredRows}
          columns={columns}
          title="Liste des taxes appliquées aux ventes"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="ventes-par-taxe"
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
          getRowId={(r) => r.taxName}
        />
      </div>
    </div>
  )
}

