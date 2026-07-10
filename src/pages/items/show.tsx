import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownCircle, ArrowLeft, ArrowUpCircle, Barcode,
  ChevronLeft, ChevronRight, Filter, Hash, History,
  Loader2, Package, Pencil, Tag, Trash2, X,
} from 'lucide-react'
import { fetchProductById, deleteProduct } from '../../api/products'
import { fetchStockMovements, type MovementType, type StockMovement } from '../../api/stockMovements'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Product, Store } from '../../types/api'

// ─── shared helpers ───────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-44">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{children}</span>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function todayISO() { return new Date().toISOString().slice(0, 10) }
function firstDayOfMonthISO() {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
}
function fmtDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' à '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── movement badge + qty ─────────────────────────────────────────────────────

const TYPE_META: Record<MovementType, { label: string; className: string }> = {
  sale:         { label: 'Vente',             className: 'bg-red-100    text-red-700'    },
  refund:       { label: 'Remboursement',     className: 'bg-orange-100 text-orange-700' },
  buyback:      { label: 'Rachat',            className: 'bg-pink-100   text-pink-700'   },
  adjustment:   { label: 'Ajustement',        className: 'bg-amber-100  text-amber-700'  },
  transfer_out: { label: 'Transfert sortant', className: 'bg-purple-100 text-purple-700' },
  transfer_in:  { label: 'Transfert entrant', className: 'bg-blue-100   text-blue-700'   },
  purchase:     { label: 'Commande',          className: 'bg-green-100  text-green-700'  },
  inventory:    { label: 'Inventaire',        className: 'bg-teal-100   text-teal-700'   },
}

function TypeBadge({ type }: { type: MovementType }) {
  const meta = TYPE_META[type] ?? { label: type, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}

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

// ─── history drawer ───────────────────────────────────────────────────────────

function HistoryDrawer({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const [stores, setStores] = useState<Store[]>([])

  const [pendingStore,    setPendingStore]    = useState('')
  const [pendingFromDate, setPendingFromDate] = useState(firstDayOfMonthISO)
  const [pendingToDate,   setPendingToDate]   = useState(todayISO)

  const [filterStore,    setFilterStore]    = useState('')
  const [filterFromDate, setFilterFromDate] = useState(firstDayOfMonthISO)
  const [filterToDate,   setFilterToDate]   = useState(todayISO)

  const [page,     setPage]     = useState(1)
  const [result,   setResult]   = useState<{ data: StockMovement[]; total: number; last_page: number } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    fetchStores(1).then(r => setStores(r.data)).catch(console.error)
  }, [])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchStockMovements({
        page:       p,
        product_id: product.id,
        store_id:   filterStore    ? Number(filterStore)    : null,
        from_date:  filterFromDate || null,
        to_date:    filterToDate   || null,
      })
      setResult(res)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [product.id, filterStore, filterFromDate, filterToDate])

  useEffect(() => { void load(page) }, [page, load])

  function applyFilters() {
    setFilterStore(pendingStore)
    setFilterFromDate(pendingFromDate)
    setFilterToDate(pendingToDate)
    setPage(1)
  }

  const movements  = result?.data ?? []
  const totalItems = result?.total ?? 0
  const lastPage   = result?.last_page ?? 1

  // prevent scroll on backdrop
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const drawerRef = useRef<HTMLDivElement>(null)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={`Historique de ${product.name}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F2E4A]">
              <History className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Historique des mouvements</p>
              <p className="text-xs text-gray-500 truncate max-w-xs">{product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="shrink-0 flex flex-wrap items-end gap-3 border-b border-gray-100 bg-gray-50 px-6 py-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Début</label>
            <input
              type="date"
              value={pendingFromDate}
              onChange={e => setPendingFromDate(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2.5 text-xs text-gray-700 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Fin</label>
            <input
              type="date"
              value={pendingToDate}
              onChange={e => setPendingToDate(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2.5 text-xs text-gray-700 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Magasin</label>
            <select
              value={pendingStore}
              onChange={e => setPendingStore(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 focus:border-[#3B82F6] focus:outline-none"
            >
              <option value="">Tous</option>
              {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F2E4A] px-4 text-xs font-semibold text-white hover:bg-[#1a4068] disabled:opacity-60"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtrer
          </button>
          {!loading && (
            <span className="ml-auto text-xs text-gray-400">
              {totalItems.toLocaleString('fr-FR')} mouvement{totalItems > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</div>
          )}

          {loading && !result ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-[#3B82F6]" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">Aucun mouvement pour cette période.</p>
              <p className="mt-1 text-xs text-gray-400">Modifiez les filtres ou élargissez la période.</p>
            </div>
          ) : (
            <div className={`transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500">Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500">Magasin</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500">Raison</th>
                    <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-gray-500">Type</th>
                    <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wide text-gray-500">Qté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                        {fmtDatetime(m.date)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{m.store_name}</td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[160px]">
                        <span className="line-clamp-2">{m.raison}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <TypeBadge type={m.movement_type} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <QtyCell value={Number(m.quantity_change)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="shrink-0 flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">Page {page} / {lastPage}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-medium text-gray-700">{page}</span>
              <button
                type="button"
                disabled={page >= lastPage || loading}
                onClick={() => setPage(p => p + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function ItemShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product,  setProduct]  = useState<Product | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const p = await fetchProductById(id)
      setProduct(p)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function handleDelete() {
    if (!product) return
    if (!window.confirm(`Supprimer définitivement l'article « ${product.name} » ?`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteProduct(product.id)
      navigate('/items', { state: { flash: `Article « ${product.name} » supprimé.` } })
    } catch (e) {
      setError(getApiErrorMessage(e))
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#EFF6FF]">
        <p className="text-sm text-red-600">{error ?? 'Article introuvable.'}</p>
        <button type="button" onClick={() => navigate('/items')}
          className="inline-flex items-center gap-2 text-sm text-[#3B82F6] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
      </div>
    )
  }

  const soldByLabel = product.sold_by === 'weight' ? 'Poids (kg)' : product.sold_by === 'surface' ? 'Surface (m²)' : 'Unité'
  const margin = product.purchase_price != null && Number(product.selling_price) > 0
    ? ((Number(product.selling_price) - Number(product.purchase_price)) / Number(product.selling_price)) * 100
    : null

  return (
    <div className="space-y-6">

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/items')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 truncate max-w-xs">{product.name}</h1>
              <p className="text-xs text-gray-400">Détail de l'article</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.track_inventory && (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                Historique
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/items/${product.id}/edit`)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className=" px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className=" px-6 py-6 space-y-5">

        {/* ─── Identité ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex gap-6 p-6">

            {/* Image ou placeholder */}
            <div className="shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-32 w-32 rounded-xl border border-gray-200 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-gray-100 border border-gray-200">
                  <Package className="h-10 w-10 text-gray-300" />
                </div>
              )}
            </div>

            {/* Nom + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                {product.color && /^#[0-9A-Fa-f]{6}$/.test(product.color) && (
                  <span
                    className="h-5 w-5 rounded-full border border-gray-200 shadow-sm shrink-0"
                    title={product.color}
                    style={{ backgroundColor: product.color }}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {product.type === 'composite'
                  ? <Badge className="bg-purple-100 text-purple-800">Composite</Badge>
                  : <Badge className="bg-blue-100 text-blue-800">Simple</Badge>}
                <Badge className="bg-gray-100 text-gray-700">{soldByLabel}</Badge>
                {product.track_inventory && <Badge className="bg-green-100 text-green-700">Stock suivi</Badge>}
                {product.tax_inclusive && <Badge className="bg-amber-100 text-amber-700">Prix TTC</Badge>}
                {product.specific_tax && <Badge className="bg-orange-100 text-orange-700">Taxe spécifique</Badge>}
              </div>

              {product.category && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  {product.category.color && (
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: product.category.color }} />
                  )}
                  {product.category.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">

          {/* ─── Tarification ───────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Tarification</p>
            </div>
            <div className="px-6 py-2">
              <InfoRow label="Prix d'achat">
                {product.purchase_price != null
                  ? <>{Number(product.purchase_price).toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">CFA</span></>
                  : <span className="text-gray-400">—</span>}
              </InfoRow>
              <InfoRow label="Prix de vente">
                <span className="text-[#0F2E4A] font-bold">
                  {Number(product.selling_price).toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">CFA</span>
                </span>
              </InfoRow>
              {margin != null && (
                <InfoRow label="Marge">
                  <span className={margin >= 30 ? 'text-green-600' : margin >= 10 ? 'text-amber-600' : 'text-red-500'}>
                    {margin.toFixed(1)}%
                  </span>
                </InfoRow>
              )}
              <InfoRow label="TVA Achat">
                {product.purchase_vat_rate
                  ? <>{product.purchase_vat_rate.name} ({product.purchase_vat_rate.rate}%)</>
                  : <span className="text-gray-400">Aucune</span>}
              </InfoRow>
              <InfoRow label="TVA Vente">
                {product.sales_vat_rate
                  ? <>{product.sales_vat_rate.name} ({product.sales_vat_rate.rate}%)</>
                  : <span className="text-gray-400">Aucune</span>}
              </InfoRow>
            </div>
          </div>

          {/* ─── Identifiants & couleur ─────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Identifiants</p>
            </div>
            <div className="px-6 py-2">
              <InfoRow label="SKU">
                {product.sku
                  ? <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-gray-400" />{product.sku}</span>
                  : <span className="text-gray-400">—</span>}
              </InfoRow>
              <InfoRow label="Code-barres">
                {product.barcode
                  ? <span className="flex items-center gap-1.5"><Barcode className="h-3.5 w-3.5 text-gray-400" />{product.barcode}</span>
                  : <span className="text-gray-400">—</span>}
              </InfoRow>
              <InfoRow label="Couleur">
                {product.color && /^#[0-9A-Fa-f]{6}$/.test(product.color) ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: product.color }} />
                    <span className="font-mono uppercase text-gray-700">{product.color}</span>
                  </span>
                ) : <span className="text-gray-400">—</span>}
              </InfoRow>
            </div>
          </div>

          {/* ─── Stock ──────────────────────────────────────────────── */}
          {product.track_inventory && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-3">
                <p className="text-sm font-semibold text-gray-700">Stock</p>
              </div>
              <div className="px-6 py-2">
                <InfoRow label="Quantité totale">
                  <span className={`font-bold ${Number(product.stock_quantity) === 0 ? 'text-red-500' : Number(product.stock_quantity) <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                    {Number(product.stock_quantity).toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">{soldByLabel}</span>
                  </span>
                </InfoRow>
                {product.stocks && product.stocks.length > 0 && product.stocks.map(s => (
                  <InfoRow key={s.store_id} label={s.store?.name ?? `Magasin #${s.store_id}`}>
                    {Number(s.quantity).toLocaleString('fr-FR')}
                  </InfoRow>
                ))}
              </div>
            </div>
          )}

          {/* ─── Métadonnées ────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Informations</p>
            </div>
            <div className="px-6 py-2">
              <InfoRow label="Créé le">
                {new Date(product.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </InfoRow>
              <InfoRow label="Modifié le">
                {new Date(product.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </InfoRow>
              <InfoRow label="Magasin principal">
                {product.store?.name ?? <span className="text-gray-400">Tous les magasins</span>}
              </InfoRow>
            </div>
          </div>

        </div>
      </div>

      {/* ─── History drawer ─────────────────────────────────────────── */}
      {showHistory && (
        <HistoryDrawer
          product={product}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
