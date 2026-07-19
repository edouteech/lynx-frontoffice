import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, Package, Search, X } from 'lucide-react'
import { createInventory } from '../../api/inventories'
import { fetchStores } from '../../api/stores'
import { fetchProducts } from '../../api/products'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Product, Store } from '../../types/api'

export default function InventoryCreatePage() {
  const navigate = useNavigate()

  const [stores, setStores]     = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  // form fields
  const [storeId, setStoreId]   = useState('')
  const [type, setType]         = useState<'full' | 'partial'>('full')
  const [note, setNote]         = useState('')

  // partial product selection
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    async function fetchAllProducts(): Promise<Product[]> {
      let all: Product[] = []
      let page = 1
      let lastPage = 1
      do {
        const res = await fetchProducts({ page, per_page: 100 })
        all = all.concat(res.data)
        lastPage = res.last_page
        page = res.current_page + 1
      } while (page <= lastPage)
      return all
    }

    Promise.all([fetchStores(1), fetchAllProducts()])
      .then(([s, p]) => {
        setStores(s.data)
        setProducts(p.filter(pr => pr.track_inventory))
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false))
  }, [])

  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    ),
  [products, search])

  function toggleProduct(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    if (!storeId) { setError('Veuillez choisir un magasin.'); return }
    if (type === 'partial' && selected.size === 0) {
      setError('Veuillez sélectionner au moins un article pour un inventaire partiel.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const inv = await createInventory({
        store_id:    Number(storeId),
        type,
        note:        note.trim() || null,
        product_ids: type === 'partial' ? Array.from(selected) : undefined,
      })
      navigate(`/inventories/${inv.id}`, { replace: true })
    } catch (e) {
      setError(getApiErrorMessage(e))
      setSaving(false)
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  const selectedProducts = products.filter(p => selected.has(p.id))

  return (
    <div className="space-y-6">

      {/* header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/inventories')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-bold text-gray-900">Nouvel inventaire</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Créer l'inventaire
          </button>
        </div>
      </div>

      <div className=" max-w-2xl px-6 py-6 space-y-5">

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {/* ── Étape 1 : paramètres ────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-sm font-semibold text-gray-700">Paramètres de l'inventaire</p>
          </div>
          <div className="p-6 space-y-5">

            {/* Magasin */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Magasin <span className="text-red-500">*</span>
              </label>
              <select
                value={storeId}
                onChange={e => setStoreId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Sélectionner un magasin</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Type d'inventaire</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['full',    'Inventaire complet',  'Tous les articles avec suivi de stock'],
                  ['partial', 'Inventaire partiel',  'Articles sélectionnés uniquement'],
                ] as const).map(([val, title, desc]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setType(val)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      type === val
                        ? 'border-[#0F2E4A] bg-[#0F2E4A]/5 ring-2 ring-[#0F2E4A]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      {type === val && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F2E4A]">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Note (optionnelle)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Commentaire sur cet inventaire…"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Étape 2 : sélection articles (partiel) ──────────────────── */}
        {type === 'partial' && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Articles à inventorier</p>
              {selected.size > 0 && (
                <span className="text-xs font-medium text-[#3B82F6]">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="p-6 space-y-4">

              {/* Sélectionnés */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(p => (
                    <span key={p.id}
                      className="flex items-center gap-1 rounded-full border border-[#0F2E4A]/20 bg-[#0F2E4A]/5 px-2.5 py-1 text-xs font-medium text-[#0F2E4A]">
                      {p.color && /^#[0-9A-Fa-f]{6}$/.test(p.color) && (
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      )}
                      {p.name}
                      <button type="button" onClick={() => toggleProduct(p.id)}>
                        <X className="h-3 w-3 ml-0.5 text-[#0F2E4A]/60 hover:text-[#0F2E4A]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un article…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                />
              </div>

              {/* Liste */}
              <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Package className="mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun article trouvé.</p>
                  </div>
                ) : (
                  filtered.map(p => {
                    const isSelected = selected.has(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProduct(p.id)}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.color && /^#[0-9A-Fa-f]{6}$/.test(p.color) && (
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                          </div>
                        </div>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected ? 'border-[#0F2E4A] bg-[#0F2E4A]' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
