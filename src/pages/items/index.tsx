import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Building2, ChevronDown, Download, FileUp, Loader2, Pencil, Plus, Trash2, Package, RefreshCw, X, Eye } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import ProductImportModal from '../../components/ProductImportModal'
import { fetchProducts, deleteProduct, fetchProductStock, recalculateAllStock, exportProducts, fetchAllProducts } from '../../api/products'
import { fetchStores } from '../../api/stores'
import { fetchItemCategories } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import { exportToPdf } from '../../lib/tableExport'
import type { ItemCategory, Product, ProductStockEntry, Store } from '../../types/api'

// ─── Alert filter options ──────────────────────────────────────────────────────

type StockAlert = '' | 'low' | 'out'

const ALERT_OPTIONS: { value: StockAlert; label: string }[] = [
  { value: '',    label: 'Tous les articles' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture de stock' },
]

// ─── Filter select primitive ───────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

// ─── Modal stock par magasin ───────────────────────────────────────────────────

function StockModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [entries, setEntries] = useState<ProductStockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProductStock(product.id)
      .then(setEntries)
      .catch(e => setError(getApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [product.id])

  const total = entries.reduce((s, e) => s + Number(e.quantity), 0)
  const unit = product.sold_by === 'weight' ? 'kg' : product.sold_by === 'surface' ? 'm²' : 'unité(s)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-gray-900">{product.name}</p>
            <p className="text-xs text-gray-400">Stock par magasin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-600">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Aucun stock enregistré.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Magasin</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Quantité</th>
                    {entries.some(e => e.min_stock_alert != null) && (
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Seuil alerte</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map(e => {
                    const belowAlert = e.min_stock_alert != null && Number(e.quantity) <= Number(e.min_stock_alert)
                    return (
                      <tr key={e.store_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${belowAlert ? 'bg-orange-400' : 'bg-green-400'}`} />
                            {e.store_name}
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${belowAlert ? 'text-orange-600' : 'text-gray-900'}`}>
                          {Number(e.quantity).toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">{unit}</span>
                        </td>
                        {entries.some(e2 => e2.min_stock_alert != null) && (
                          <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                            {e.min_stock_alert != null ? Number(e.min_stock_alert).toLocaleString('fr-FR') : '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && entries.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <span className="text-xs text-gray-500">Total tous magasins</span>
            <span className="text-sm font-bold text-gray-900">
              {total.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">{unit}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page liste ────────────────────────────────────────────────────────────────

export default function ItemsIndex() {
  const navigate = useNavigate()
  const location = useLocation()

  // flash message from form redirect
  const [flash, setFlash] = useState<string | null>(() => {
    const state = location.state as { flash?: string } | null
    return state?.flash ?? null
  })

  useEffect(() => {
    if (flash) {
      window.history.replaceState({}, '')
      const t = setTimeout(() => setFlash(null), 5000)
      return () => clearTimeout(t)
    }
  }, [flash])

  // data
  const [paginated, setPaginated] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')

  // meta for filters
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])

  // filter state
  const [filterStore, setFilterStore] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAlert, setFilterAlert] = useState<StockAlert>('')

  // recalculate
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null)

  // export
  const [exporting, setExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  // modal
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)
  const [showImport, setShowImport] = useState(false)

  // Load stores + categories once
  useEffect(() => {
    Promise.all([fetchStores(1), fetchItemCategories(1)])
      .then(([s, c]) => {
        setStores(s.data)
        setCategories(c.data)
      })
      .catch(console.error)
  }, [])

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProducts({
        page: p,
        per_page:    pageSize,
        search:      searchQuery.trim() || undefined,
        store_id:    filterStore    ? Number(filterStore)    : null,
        category_id: filterCategory ? Number(filterCategory) : null,
        stock_alert: filterAlert || null,
      })
      setPaginated(res)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setPaginated(null)
    } finally {
      setLoading(false)
    }
  }, [filterStore, filterCategory, filterAlert, pageSize, searchQuery])

  // Reload when page or filters change
  useEffect(() => {
    void load(page)
  }, [page, load])

  // Reset to page 1 when filters/recherche/taille de page changent
  useEffect(() => {
    setPage(1)
  }, [filterStore, filterCategory, filterAlert, searchQuery, pageSize])

  const hasActiveFilter = filterStore !== '' || filterCategory !== '' || filterAlert !== '' || searchQuery.trim() !== ''

  function clearFilters() {
    setFilterStore('')
    setFilterCategory('')
    setFilterAlert('')
  }

  const handleDelete = useCallback(async (p: Product) => {
    if (!window.confirm(`Supprimer l'article « ${p.name} » ?`)) return
    try {
      await deleteProduct(p.id)
      void load(page)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }, [page, load])

  async function handleRecalculate() {
    setRecalculating(true)
    setRecalcMsg(null)
    setError(null)
    try {
      const { updated } = await recalculateAllStock()
      setRecalcMsg(`Stock recalculé pour ${updated} article(s).`)
      void load(page)
      setTimeout(() => setRecalcMsg(null), 4000)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setRecalculating(false)
    }
  }

  const currentFilters = () => ({
    search:      searchQuery.trim() || undefined,
    store_id:    filterStore    ? Number(filterStore)    : null,
    category_id: filterCategory ? Number(filterCategory) : null,
    stock_alert: filterAlert || null,
  })

  async function handleExportFile(format: 'xlsx' | 'csv') {
    setExportMenuOpen(false)
    setExporting(true)
    setError(null)
    try {
      const blob = await exportProducts({ ...currentFilters(), format })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `articles_${new Date().toISOString().slice(0, 10)}.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  async function handleExportPdf() {
    setExportMenuOpen(false)
    setExporting(true)
    setError(null)
    try {
      const products = await fetchAllProducts(currentFilters())
      const soldByLabels: Record<string, string> = { unit: 'unité', weight: 'poids', surface: 'surface' }
      const rows = products.map(p => [
        p.name,
        p.category?.name ?? '',
        p.sku ?? '',
        p.purchase_price != null ? Number(p.purchase_price) : null,
        Number(storeFiltered && p.store_selling_price != null ? p.store_selling_price : p.selling_price),
        p.track_inventory
          ? Number(storeFiltered && p.store_stock_quantity != null ? p.store_stock_quantity : p.stock_quantity)
          : null,
        soldByLabels[p.sold_by] ?? 'unité',
      ])
      exportToPdf({
        filename: `articles_${new Date().toISOString().slice(0, 10)}`,
        title: 'Articles',
        headers: ['Article', 'Catégorie', 'Référence', 'P. Achat', 'P. Vente', 'Stock', 'Vendu par'],
        rows,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const storeFiltered = filterStore !== ''

  const columns: Column<Product>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Article',
      sortable: true,
      render: (_value, p) => (
        <div className="flex items-center gap-3">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg object-cover border border-gray-200" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{p.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {p.sku && <span className="text-xs text-gray-400">SKU: {p.sku}</span>}
              {p.category && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  {p.sku && <span className="text-gray-300">·</span>}
                  {p.category.color && (
                    <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: p.category.color }} />
                  )}
                  {p.category.name}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: v => v === 'composite'
        ? <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">Composite</span>
        : <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">Simple</span>,
    },
    {
      key: 'purchase_price',
      label: 'P. Achat',
      align: 'right',
      render: v => v != null
        ? <span className="text-gray-700">{Number(v).toLocaleString('fr-FR')} <span className="text-xs text-gray-400">CFA</span></span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'selling_price',
      label: storeFiltered ? 'P. Vente (magasin)' : 'P. Vente',
      align: 'right',
      sortable: true,
      render: (v, p) => {
        const price = storeFiltered && p.store_selling_price != null
          ? Number(p.store_selling_price)
          : Number(v)
        return (
          <span className="font-semibold text-gray-900">
            {price.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">CFA</span>
          </span>
        )
      },
    },
    {
      key: 'margin',
      label: 'Marge',
      align: 'right',
      render: (_, p) => {
        const sellingPrice = storeFiltered && p.store_selling_price != null
          ? Number(p.store_selling_price)
          : Number(p.selling_price)
        let pct: number | null = null
        if (p.purchase_price != null && sellingPrice > 0) {
          pct = ((sellingPrice - Number(p.purchase_price)) / sellingPrice) * 100
        }
        if (pct == null) return <span className="text-gray-300">—</span>
        const color = pct >= 30 ? 'text-green-600' : pct >= 10 ? 'text-amber-600' : 'text-red-500'
        return <span className={`font-medium ${color}`}>{pct.toFixed(1)}%</span>
      },
    },
    {
      key: 'track_inventory',
      label: storeFiltered ? 'Stock (magasin)' : 'Stock',
      align: 'center',
      render: (v, p) => {
        if (!v) return <span className="text-gray-400 text-xs">Non suivi</span>
        const qty = storeFiltered && p.store_stock_quantity != null
          ? Number(p.store_stock_quantity)
          : Number(p.stock_quantity)
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className={`text-sm font-semibold ${qty === 0 ? 'text-red-500' : qty <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
              {qty.toLocaleString('fr-FR')}
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setStockModalProduct(p) }}
              title="Voir le stock par magasin"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      },
    },
  ], [storeFiltered])

  const actions: Action<Product>[] = useMemo(() => [
    { label: 'Voir', icon: Eye, variant: 'default', onClick: p => navigate(`/items/${p.id}`) },
    { label: 'Modifier', icon: Pencil, variant: 'primary', onClick: p => navigate(`/items/${p.id}/edit`) },
    { label: 'Supprimer', icon: Trash2, variant: 'danger', onClick: p => void handleDelete(p) },
  ], [navigate, handleDelete])

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Articles</h1>
          <p className="mt-1 text-gray-600">Gestion de votre catalogue d'articles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRecalculate()}
            disabled={recalculating}
            title="Recalculer les stocks à partir de toutes les opérations"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            Actualiser les stocks
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileUp className="h-4 w-4" />
            Importer Excel
          </button>
          <button
            onClick={() => navigate('/items/create')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#2563EB] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Filtres</span>

        <FilterSelect
          value={filterStore}
          onChange={setFilterStore}
          placeholder="Tous les magasins"
          options={stores.map(s => ({ value: String(s.id), label: s.name }))}
        />

        <FilterSelect
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder="Toutes les catégories"
          options={categories.map(c => ({ value: String(c.id), label: c.name }))}
        />

        <FilterSelect
          value={filterAlert}
          onChange={v => setFilterAlert(v as StockAlert)}
          placeholder="Alerte stock"
          options={ALERT_OPTIONS.filter(o => o.value !== '')}
        />

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
            Effacer
          </button>
        )}
      </div>

      {/* Flash message (après redirection formulaire) */}
      {flash && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} className="ml-4 text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Feedback messages */}
      {recalcMsg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {recalcMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <DataTable<Product>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        searchable
        searchPlaceholder="Rechercher un article…"
        onSearch={setSearchQuery}
        customFilters={
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={exporting}
              title="Exporter les articles correspondant aux filtres actuels"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => void handleExportFile('csv')}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportFile('xlsx')}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Excel (XLSX)
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  PDF
                </button>
              </div>
            )}
          </div>
        }
        pagination={false}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        serverPagination={paginated ? {
          currentPage: paginated.current_page,
          lastPage: paginated.last_page,
          total: paginated.total,
          pageSize,
          onPageChange: p => { setPage(p) },
          onPageSizeChange: setPageSize,
          disabled: loading,
        } : undefined}
        emptyMessage={
          <div className="py-8 text-center">
            <Package className=" mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">
              {hasActiveFilter ? 'Aucun article ne correspond aux filtres.' : 'Aucun article pour le moment.'}
            </p>
            {!hasActiveFilter && (
              <button
                onClick={() => navigate('/items/create')}
                className="mt-3 text-[#3B82F6] hover:underline text-sm font-medium"
              >
                Créer votre premier article →
              </button>
            )}
          </div>
        }
        getRowId={p => p.id}
      />

      {stockModalProduct && (
        <StockModal
          product={stockModalProduct}
          onClose={() => setStockModalProduct(null)}
        />
      )}

      {showImport && (
        <ProductImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { void load(page) }}
        />
      )}
    </div>
  )
}
