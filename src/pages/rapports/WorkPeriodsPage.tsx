import { useMemo, useState } from 'react'
import {
  Filter,
  Store,
  Printer,
  RotateCcw,
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'

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

function formatInteger(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
    value
  )
}

function toDateTimeLocalValue(d: Date, time: string = '00:00') {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`
}

function DiffCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400">-</span>
  const isNeg = value < 0
  return (
    <span className={isNeg ? 'font-medium text-red-600' : 'text-gray-700'}>
      {formatInteger(value)}
    </span>
  )
}

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

  // Draft (UI) filters
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

  // Applied filters (used by the table)
  const [appliedStoreId, setAppliedStoreId] = useState<string>('all')
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom)
  const [appliedTo, setAppliedTo] = useState(defaultTo)

  const stores = [
    { id: 'all', name: 'Tous les magasins' },
    { id: '1', name: 'ALUTRACO' },
    { id: '2', name: 'PLOMBERIES' },
    { id: '3', name: 'RESTAURANT' },
  ]

  const rows: Row[] = useMemo(() => {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

    const a = mk(2, 1)
    const b = mk(7, 7) // same day
    const c = mk(12, 10)
    const d = mk(18, 16)
    const e = mk(25, 24)

    return [
      {
        code: '152-0265',
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
        code: '152-0266',
        pvd: 'Caisse 4 PL (PLOMBERIES)',
        openedAt: b.openedAt,
        closedAt: b.closedAt,
        expectedCash: 110_000,
        realCash: 110_000,
        diff: null,
        storeId: '2',
        openedAtIso: b.openedAtIso,
      },
      {
        code: '152-0267',
        pvd: 'Caisse 1 RE (RESTAURANT)',
        openedAt: c.openedAt,
        closedAt: c.closedAt,
        expectedCash: 408_000,
        realCash: 395_000,
        diff: -13_000,
        storeId: '3',
        openedAtIso: c.openedAtIso,
      },
      {
        code: '152-0268',
        pvd: 'Caisse 2 AL (ALUTRACO)',
        openedAt: d.openedAt,
        closedAt: d.closedAt,
        expectedCash: 704_290,
        realCash: 0,
        diff: -704_290,
        storeId: '1',
        openedAtIso: d.openedAtIso,
      },
      {
        code: '152-0269',
        pvd: 'Caisse 1 RE (RESTAURANT)',
        openedAt: e.openedAt,
        closedAt: e.closedAt,
        expectedCash: 58_200,
        realCash: 60_000,
        diff: 1_800,
        storeId: '3',
        openedAtIso: e.openedAtIso,
      },
    ]
  }, [])

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: 'code', label: 'Code', sortable: true, nowrap: true },
      {
        key: 'pvd',
        label: 'PVD',
        sortable: true,
        render: (v) => (
          <span className="font-semibold text-[#2563EB]">
            {String(v ?? '')}
          </span>
        ),
      },
      { key: 'openedAt', label: "Date d’ouverture", sortable: true },
      { key: 'closedAt', label: 'Date de fermeture', sortable: true },
      {
        key: 'expectedCash',
        label: 'Espèces prévu',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: 'realCash',
        label: 'Espèces réel',
        sortable: true,
        align: 'right',
        render: (v) => formatInteger(Number(v ?? 0)),
      },
      {
        key: 'diff',
        label: 'Différence',
        sortable: true,
        align: 'right',
        render: (v) => <DiffCell value={v as number | null} />,
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
      if (appliedStoreId !== 'all' && r.storeId !== appliedStoreId) return false
      const openedTs = new Date(r.openedAtIso).getTime()
      if (Number.isNaN(openedTs)) return true
      return openedTs >= fromTs && openedTs <= toTs
    })
  }, [appliedFrom, appliedStoreId, appliedTo, rows])

  return (
    <div className="space-y-6">
      <header className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900">
          Période de travail
        </h1>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
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

          <label className="lg:col-span-4">
            <div className="mb-1 text-xs font-semibold text-gray-600">
              Les Magasins
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
          title="Liste des périodes de travail"
          searchable
          searchPlaceholder="Recherche…"
          exportFilename="periodes-de-travail"
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

