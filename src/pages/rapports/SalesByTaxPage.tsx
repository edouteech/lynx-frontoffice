import { useEffect, useMemo, useState } from 'react'
import {
  Filter,
  Store,
  UserRound,
  Printer,
  RotateCcw,
  BadgePercent,
  Receipt,
  Scale
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { fetchSalesByTax, type SalesByTax } from '../../api/salesByTax'
import { fetchUsers } from '../../api/users'
import { fetchStores } from '../../api/stores'

/* ================= TYPES ================= */

type Row = SalesByTax;

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

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'Tous les employés' },
  ])
  const [stores, setStores] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'Tous les magasins' },
  ])

  /* ================= LOAD META ================= */
  useEffect(() => {
    async function loadMeta() {
      try {
        const [usersRes, storesRes] = await Promise.all([
          fetchUsers(1),
          fetchStores(1),
        ])
        setEmployees([{ id: 'all', name: 'Tous les employés' }, ...usersRes.data.map(u => ({ id: String(u.id), name: u.name }))])
        setStores([{ id: 'all', name: 'Tous les magasins' }, ...storesRes.data.map(s => ({ id: String(s.id), name: s.name }))])
      } catch (e) {
        console.error(e)
      }
    }
    loadMeta()
  }, [])

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetchSalesByTax({
          start_date: appliedFrom,
          end_date: appliedTo,
          store_id: appliedStoreId !== 'all' ? Number(appliedStoreId) : undefined,
          employee_id: appliedEmployeeId !== 'all' ? Number(appliedEmployeeId) : undefined,
        })
        setRows(res.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [appliedFrom, appliedTo, appliedStoreId, appliedEmployeeId])

  /* ================= KPI ================= */
  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      taxable: acc.taxable + Number(row.taxable_amount),
      tax: acc.tax + Number(row.tax_amount),
      total_ttc: acc.total_ttc + Number(row.total_ttc),
    }), { taxable: 0, tax: 0, total_ttc: 0 })
  }, [rows])

  /* ================= COLUMNS ================= */
  const columns: Column<Row>[] = useMemo(
    () => [
      { 
        key: 'tax_name', 
        label: 'Type de taxe', 
        sortable: true,
        render: (v) => <span className="font-semibold text-gray-900">{String(v)}</span>
      },
      {
        key: 'tax_rate',
        label: 'Taux',
        sortable: true,
        align: 'right',
        render: (v) => (
          <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {Number(v)}%
          </span>
        ),
      },
      {
        key: 'taxable_amount',
        label: 'Ventes Taxables (HT)',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-medium text-gray-700">{formatFcfa(Number(v ?? 0))}</span>,
      },
      {
        key: 'tax_amount',
        label: 'Montant Taxe',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-bold text-emerald-600">{formatFcfa(Number(v ?? 0))}</span>,
      },
      {
        key: 'total_ttc',
        label: 'Total TTC',
        sortable: true,
        align: 'right',
        render: (v) => <span className="font-bold text-gray-900">{formatFcfa(Number(v ?? 0))}</span>,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">Rapport fiscal des ventes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyse de la TVA collectée et des bases taxables
        </p>
      </header>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm mb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <label className="lg:col-span-3">
            <div className="mb-1 text-xs font-semibold text-gray-600">Employés</div>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
            <div className="mb-1 text-xs font-semibold text-gray-600">Magasin</div>
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
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Base Taxable (HT)"
          value={<span className="text-2xl font-bold text-gray-900">{formatFcfa(totals.taxable)}</span>}
          icon={Receipt}
          accent="bg-blue-600"
        />
        <KpiCard
          label="TVA Collectée"
          value={<span className="text-2xl font-bold text-emerald-600">{formatFcfa(totals.tax)}</span>}
          icon={BadgePercent}
          accent="bg-emerald-600"
        />
        <KpiCard
          label="Total Ventes (TTC)"
          value={<span className="text-2xl font-bold text-gray-900">{formatFcfa(totals.total_ttc)}</span>}
          icon={Scale}
          accent="bg-violet-600"
        />
      </div>

      {/* TABLE */}
      <div className="mt-6">
        <DataTable<Row>
          data={rows}
          columns={columns}
          title="Récapitulatif des taxes collectées"
          searchable
          searchPlaceholder="Rechercher une taxe..."
          exportFilename="ventes-par-taxe"
          loading={loading}
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
          getRowId={(r) => r.tax_name}
        />
      </div>
    </div>
  )
}


