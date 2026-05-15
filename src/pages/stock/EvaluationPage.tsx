import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Package, TrendingUp } from 'lucide-react'
import { fetchProducts } from '../../api/products'
import { fetchStores } from '../../api/stores'
import { fetchItemCategories } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory, Product, Store } from '../../types/api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%'
}

function marginColor(pct: number) {
  if (pct >= 30) return 'text-green-600'
  if (pct >= 10) return 'text-amber-600'
  return 'text-red-500'
}

// ─── selectors ────────────────────────────────────────────────────────────────

function StoreSelector({
  stores,
  value,
  onChange,
}: {
  stores: Store[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
      >
        <option value="">Tous les magasins</option>
        {stores.map(s => (
          <option key={s.id} value={String(s.id)}>{s.name}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function CategorySelector({
  categories,
  value,
  onChange,
}: {
  categories: ItemCategory[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-9 text-sm text-gray-700 shadow-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
      >
        <option value="">Toutes les catégories</option>
        {categories.map(c => (
          <option key={c.id} value={String(c.id)}>{c.name}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

// ─── summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent: 'blue' | 'green' | 'amber' | 'purple'
}) {
  const border = {
    blue:   'border-l-[#3B82F6]  bg-blue-50/40',
    green:  'border-l-emerald-500 bg-emerald-50/40',
    amber:  'border-l-amber-500   bg-amber-50/40',
    purple: 'border-l-purple-500  bg-purple-50/40',
  }[accent]

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 ${border}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── derived metrics ──────────────────────────────────────────────────────────

interface ProductRow {
  product: Product
  sellingPrice: number
  quantity: number
  marginUnit: number | null   // selling - purchase
  marginPct: number | null    // (selling - purchase) / selling * 100
  valuation: number           // qty * selling
  globalCost: number | null   // qty * purchase
  globalMargin: number | null // qty * marginUnit
}

function deriveRow(p: Product, storeId: string): ProductRow {
  const sellingPrice = storeId && p.store_selling_price != null
    ? Number(p.store_selling_price)
    : Number(p.selling_price)

  const quantity = storeId && p.store_stock_quantity != null
    ? Number(p.store_stock_quantity)
    : Number(p.stock_quantity)

  const purchase = p.purchase_price != null ? Number(p.purchase_price) : null

  const marginUnit = purchase != null ? sellingPrice - purchase : null
  const marginPct  = purchase != null && sellingPrice > 0
    ? ((sellingPrice - purchase) / sellingPrice) * 100
    : null
  const valuation    = quantity * sellingPrice
  const globalCost   = purchase != null ? quantity * purchase : null
  const globalMargin = marginUnit != null ? quantity * marginUnit : null

  return { product: p, sellingPrice, quantity, marginUnit, marginPct, valuation, globalCost, globalMargin }
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function StockEvaluationPage() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')

  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [storeId, setStoreId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // load stores + categories once
  useEffect(() => {
    Promise.all([fetchStores(1), fetchItemCategories(1)])
      .then(([s, c]) => {
        setStores(s.data)
        setCategories(c.data)
      })
      .catch(console.error)
  }, [])

  // reset page when filters change
  useEffect(() => { setPage(1) }, [storeId, categoryId])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProducts({
        page: p,
        store_id: storeId ? Number(storeId) : null,
        category_id: categoryId ? Number(categoryId) : null,
      })
      setPaginated(res)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setPaginated(null)
    } finally {
      setLoading(false)
    }
  }, [storeId, categoryId])

  useEffect(() => { void load(page) }, [page, load])

  // derive rows
  const rows: ProductRow[] = useMemo(() => {
    const products: Product[] = paginated?.data ?? []
    return products.map(p => deriveRow(p, storeId))
  }, [paginated, storeId])

  // page-level totals
  const totals = useMemo(() => ({
    count:         rows.length,
    totalQuantity: rows.filter(r => r.product.track_inventory).reduce((s, r) => s + r.quantity, 0),
    globalCost:    rows.reduce((s, r) => s + (r.globalCost ?? 0), 0),
    valuation:     rows.reduce((s, r) => s + r.valuation, 0),
    globalMargin:  rows.reduce((s, r) => s + (r.globalMargin ?? 0), 0),
    avgMarginPct: (() => {
      const withMargin = rows.filter(r => r.marginPct != null)
      if (!withMargin.length) return null
      return withMargin.reduce((s, r) => s + r.marginPct!, 0) / withMargin.length
    })(),
  }), [rows])

  const hasPrev = page > 1
  const hasNext = paginated ? page < paginated.last_page : false
  const totalPages = paginated?.last_page ?? 1
  const totalItems = paginated?.total ?? 0

  return (
    <div className="space-y-6">

      {/* ─── header ──────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2E4A]">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {type === 'dashboard' ? 'Stock Global' : 'Évaluation de stock'}
              </h1>
              <p className="text-sm text-gray-500">
                {type === 'dashboard' 
                  ? 'Aperçu global de la valeur de votre stock' 
                  : 'Valorisation et marges de votre catalogue'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CategorySelector categories={categories} value={categoryId} onChange={setCategoryId} />
            <StoreSelector stores={stores} value={storeId} onChange={setStoreId} />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* ─── summary cards ───────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Articles affichés"
            value={String(totalItems)}
            sub={storeId ? 'dans ce magasin' : 'tous magasins'}
            accent="blue"
          />
          <SummaryCard
            label="Valorisation (page)"
            value={`${fmt(totals.valuation)} CFA`}
            sub="quantité × prix de vente"
            accent="green"
          />
          <SummaryCard
            label="Marge globale (page)"
            value={totals.globalMargin !== 0 ? `${fmt(totals.globalMargin)} CFA` : '—'}
            sub="quantité × marge unitaire"
            accent="amber"
          />
          <SummaryCard
            label="Marge moy. (page)"
            value={totals.avgMarginPct != null ? fmtPct(totals.avgMarginPct) : '—'}
            sub="articles avec prix d'achat"
            accent="purple"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {/* ─── table ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {loading && !paginated ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">Aucun article trouvé.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    {/* ... table content remains the same ... */}
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">P. Achat</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">P. Vente</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Marge %</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Marge unit. (CFA)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté en stock</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Coût global (CFA)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Valorisation (CFA)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Marge globale (CFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(r => (
                      <tr key={r.product.id} className={`hover:bg-gray-50 transition-colors ${loading ? 'opacity-60' : ''}`}>

                        {/* Article */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {r.product.image_url ? (
                              <img src={r.product.image_url} alt={r.product.name}
                                className="h-9 w-9 shrink-0 rounded-lg object-cover border border-gray-200" />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {r.product.color && /^#[0-9A-Fa-f]{6}$/.test(r.product.color) && (
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-gray-200"
                                    style={{ backgroundColor: r.product.color }} />
                                )}
                                <p className="font-medium text-gray-900 truncate max-w-[180px]">{r.product.name}</p>
                              </div>
                              {r.product.sku && (
                                <p className="text-xs text-gray-400">{r.product.sku}</p>
                              )}
                              {r.product.category && (
                                <p className="text-xs text-gray-400">{r.product.category.name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Prix d'achat */}
                        <td className="px-4 py-3 text-right text-gray-700">
                          {r.product.purchase_price != null
                            ? <>{fmt(Number(r.product.purchase_price))} <span className="text-xs text-gray-400">CFA</span></>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Prix de vente */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {fmt(r.sellingPrice)} <span className="text-xs font-normal text-gray-400">CFA</span>
                        </td>

                        {/* Marge % */}
                        <td className="px-4 py-3 text-right">
                          {r.marginPct != null
                            ? <span className={`font-semibold ${marginColor(r.marginPct)}`}>{fmtPct(r.marginPct)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Marge unitaire */}
                        <td className="px-4 py-3 text-right">
                          {r.marginUnit != null
                            ? <span className={r.marginUnit >= 0 ? 'text-gray-700' : 'text-red-500'}>
                                {fmt(r.marginUnit)} <span className="text-xs text-gray-400">CFA</span>
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Quantité */}
                        <td className="px-4 py-3 text-right">
                          {r.product.track_inventory
                            ? <span className={`font-medium ${r.quantity === 0 ? 'text-red-500' : r.quantity <= 5 ? 'text-amber-600' : 'text-gray-800'}`}>
                                {r.quantity.toLocaleString('fr-FR')}
                              </span>
                            : <span className="text-xs text-gray-400">Non suivi</span>}
                        </td>

                        {/* Coût global */}
                        <td className="px-4 py-3 text-right">
                          {r.product.track_inventory && r.globalCost != null
                            ? <span className="text-gray-700">{fmt(r.globalCost)} <span className="text-xs text-gray-400">CFA</span></span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Valorisation */}
                        <td className="px-4 py-3 text-right font-semibold text-[#0F2E4A]">
                          {r.product.track_inventory
                            ? <>{fmt(r.valuation)} <span className="text-xs font-normal text-gray-400">CFA</span></>
                            : <span className="text-xs text-gray-400">—</span>}
                        </td>

                        {/* Marge globale */}
                        <td className="px-4 py-3 text-right">
                          {r.product.track_inventory && r.globalMargin != null
                            ? <span className={`font-semibold ${r.globalMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {fmt(r.globalMargin)} <span className="text-xs font-normal text-gray-400">CFA</span>
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>

                      </tr>
                    ))}
                  </tbody>

                  {/* totals footer */}
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Totaux (page {page}/{totalPages})
                      </td>
                      <td colSpan={4} />
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {fmt(totals.totalQuantity)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700">
                        {fmt(totals.globalCost)} <span className="text-xs font-normal text-gray-400">CFA</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0F2E4A]">
                        {fmt(totals.valuation)} <span className="text-xs font-normal text-gray-400">CFA</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {fmt(totals.globalMargin)} <span className="text-xs font-normal text-gray-400">CFA</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ─── pagination ───────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <p className="text-xs text-gray-500">
                    {totalItems} article{totalItems > 1 ? 's' : ''} — page {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!hasPrev || loading}
                      onClick={() => setPage(p => p - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm font-medium text-gray-700">{page}</span>
                    <button
                      type="button"
                      disabled={!hasNext || loading}
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


        <p className="text-xs text-gray-400 text-center">
          Les totaux affichés sont calculés sur les articles de la page en cours.
          {!storeId && ' Sélectionnez un magasin pour voir les prix et quantités par magasin.'}
        </p>

      </div>
    </div>
  )
}
