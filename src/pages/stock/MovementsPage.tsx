import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Filter, Loader2,
} from 'lucide-react'
import { fetchStockMovements, type MovementType, type StockMovement } from '../../api/stockMovements'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Store } from '../../types/api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonthISO() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

// ─── movement type badge ──────────────────────────────────────────────────────

const TYPE_META: Record<MovementType, { label: string; className: string }> = {
  sale:         { label: 'Vente',              className: 'bg-red-100    text-red-700'    },
  adjustment:   { label: 'Ajustement',         className: 'bg-amber-100  text-amber-700'  },
  transfer_out: { label: 'Transfert sortant',  className: 'bg-purple-100 text-purple-700' },
  transfer_in:  { label: 'Transfert entrant',  className: 'bg-blue-100   text-blue-700'   },
  purchase:     { label: 'Commande',           className: 'bg-green-100  text-green-700'  },
  inventory:    { label: 'Inventaire',         className: 'bg-teal-100   text-teal-700'   },
}

function TypeBadge({ type }: { type: MovementType }) {
  const { label, className } = TYPE_META[type] ?? { label: type, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

// ─── quantity cell ────────────────────────────────────────────────────────────

function QtyCell({ value }: { value: number }) {
  const positive = value > 0
  const zero     = value === 0
  return (
    <span className={`flex items-center justify-end gap-1 font-semibold tabular-nums ${
      zero ? 'text-gray-400' : positive ? 'text-emerald-600' : 'text-red-600'
    }`}>
      {!zero && (positive
        ? <ArrowUpCircle   className="h-3.5 w-3.5 shrink-0" />
        : <ArrowDownCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      {positive ? '+' : ''}{Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
    </span>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function StockMovementsPage() {
  const [stores, setStores] = useState<Store[]>([])

  // filter state (pending — applied on button click)
  const [pendingStore,    setPendingStore]    = useState('')
  const [pendingFromDate, setPendingFromDate] = useState(firstDayOfMonthISO)
  const [pendingToDate,   setPendingToDate]   = useState(todayISO)

  // applied filters
  const [filterStore,    setFilterStore]    = useState('')
  const [filterFromDate, setFilterFromDate] = useState(firstDayOfMonthISO)
  const [filterToDate,   setFilterToDate]   = useState(todayISO)

  const [page,      setPage]      = useState(1)
  const [result,    setResult]    = useState<{ data: StockMovement[]; total: number; last_page: number } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // load stores once
  useEffect(() => {
    fetchStores(1).then(r => setStores(r.data)).catch(console.error)
  }, [])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStockMovements({
        page:      p,
        store_id:  filterStore    ? Number(filterStore)    : null,
        from_date: filterFromDate || null,
        to_date:   filterToDate   || null,
      })
      setResult(res)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [filterStore, filterFromDate, filterToDate])

  useEffect(() => { void load(page) }, [page, load])

  function applyFilters() {
    setFilterStore(pendingStore)
    setFilterFromDate(pendingFromDate)
    setFilterToDate(pendingToDate)
    setPage(1)
  }

  const movements = result?.data ?? []
  const totalItems = result?.total ?? 0
  const lastPage   = result?.last_page ?? 1

  return (
    <div className="space-y-6">

      {/* ─── header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2E4A]">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique des stocks</h1>
            <p className="text-sm text-gray-500">Tous les mouvements de stock — ventes, commandes, ajustements, transferts, inventaires</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">

        {/* ─── filter bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">

          {/* Date début */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Date début</label>
            <input
              type="date"
              value={pendingFromDate}
              onChange={e => setPendingFromDate(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Date fin</label>
            <input
              type="date"
              value={pendingToDate}
              onChange={e => setPendingToDate(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
          </div>

          {/* Magasin */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Magasin</label>
            <div className="relative">
              <select
                value={pendingStore}
                onChange={e => setPendingStore(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Tous les magasins</option>
                {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Bouton filtrer */}
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0F2E4A] px-5 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-60"
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {/* ─── table ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* table header info */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <p className="text-sm font-semibold text-gray-700">
              La liste des historiques des stocks
            </p>
            {!loading && (
              <p className="text-xs text-gray-400">{totalItems.toLocaleString('fr-FR')} mouvement{totalItems > 1 ? 's' : ''}</p>
            )}
          </div>

          {loading && !result ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm text-gray-500">Aucun mouvement pour cette période.</p>
              <p className="mt-1 text-xs text-gray-400">Modifiez les filtres ou élargissez la période.</p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Magasin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Raison</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ajustement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">

                        {/* Date */}
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {fmtDatetime(m.date)}
                        </td>

                        {/* Article */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{m.product_name}</p>
                          {m.product_sku && (
                            <p className="text-xs text-gray-400">{m.product_sku}</p>
                          )}
                        </td>

                        {/* Magasin */}
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {m.store_name}
                        </td>

                        {/* Raison */}
                        <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                          <span className="line-clamp-2">{m.raison}</span>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <TypeBadge type={m.movement_type} />
                        </td>

                        {/* Ajustement */}
                        <td className="px-5 py-3 text-right">
                          <QtyCell value={Number(m.quantity_change)} />
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ─── pagination ──────────────────────────────────────── */}
              {lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                  <p className="text-xs text-gray-500">
                    Page {page} / {lastPage} · {totalItems.toLocaleString('fr-FR')} résultat{totalItems > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage(p => p - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm font-medium text-gray-700">{page}</span>
                    <button
                      type="button"
                      disabled={page >= lastPage || loading}
                      onClick={() => setPage(p => p + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="font-medium">Types :</span>
          {(Object.entries(TYPE_META) as [MovementType, typeof TYPE_META[MovementType]][]).map(([type, meta]) => (
            <span key={type} className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${meta.className}`}>
              {meta.label}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
