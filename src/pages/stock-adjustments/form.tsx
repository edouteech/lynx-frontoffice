import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Check, ChevronDown,
  Loader2, Minus, Package, PackagePlus, Plus, Save, Trash2,
} from 'lucide-react'
import {
  fetchStockAdjustment, createStockAdjustment, updateStockAdjustment,
  addStockAdjustmentItem, updateStockAdjustmentItem, removeStockAdjustmentItem,
  applyStockAdjustment,
} from '../../api/stockAdjustments'
import { fetchStores } from '../../api/stores'
import { fetchProducts } from '../../api/products'
import { fetchItemCategories } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory, Product, StockAdjustmentItem, Store } from '../../types/api'

// ── Primitives ────────────────────────────────────────────────────────────────

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500 ${props.className ?? ''}`} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500 ${props.className ?? ''}`} />
}

// ── Types locaux ──────────────────────────────────────────────────────────────

interface PendingItem {
  tempId: number
  productId: number
  productName: string
  productSku: string | null
  productCategory: string | null
  quantityChange: number  // positif = ajout, négatif = retrait
}

const STATUS_META = {
  draft:     { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  applied:   { label: 'Appliqué',  className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',   className: 'bg-red-100 text-red-600' },
} as const

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StockAdjustmentForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  // meta
  const [stores, setStores] = useState<Store[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingAdjustment, setLoadingAdjustment] = useState(isEdit)

  // header
  const [storeId, setStoreId] = useState('')
  const [adjustmentDate, setAdjustmentDate] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'draft' | 'applied' | 'cancelled'>('draft')

  // items (edit mode : depuis l'API)
  const [items, setItems] = useState<StockAdjustmentItem[]>([])
  const [qtyEdits, setQtyEdits] = useState<Record<number, string>>({})

  // pending items (create mode : local)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [pendingQtyEdits, setPendingQtyEdits] = useState<Record<number, string>>({})
  const tempIdRef = useRef(0)

  // add-item form
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addType, setAddType] = useState<'add' | 'remove'>('add')

  // search
  const [searchQuery, setSearchQuery] = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyErrors, setApplyErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isDraft = status === 'draft'

  // ── Load meta ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchStores(1), fetchProducts(1), fetchItemCategories(1)])
      .then(([strs, prods, cats]) => {
        setStores(strs.data)
        setAllProducts(prods.data)
        setCategories(cats.data)
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false))
  }, [])

  // ── Load adjustment (edit mode) ────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    fetchStockAdjustment(id!)
      .then(a => {
        setStoreId(String(a.store_id))
        setAdjustmentDate(a.adjustment_date ?? '')
        setNote(a.note ?? '')
        setStatus(a.status)
        const its = a.items ?? []
        setItems(its)
        const edits: Record<number, string> = {}
        its.forEach(i => { edits[i.id] = String(Math.abs(i.quantity_change)) })
        setQtyEdits(edits)
      })
      .catch(() => setError('Impossible de charger l\'ajustement.'))
      .finally(() => setLoadingAdjustment(false))
  }, [id, isEdit])

  // ── Produits filtrés ───────────────────────────────────────────────────────
  const filteredProducts = filterCategoryId
    ? allProducts.filter(p => String(p.item_category_id) === filterCategoryId)
    : allProducts

  // ── Items affichés ─────────────────────────────────────────────────────────
  const displayItems: StockAdjustmentItem[] = isEdit
    ? items.map(i => {
        const sign = i.quantity_change >= 0 ? 1 : -1
        const absQty = parseFloat(qtyEdits[i.id] ?? String(Math.abs(i.quantity_change))) || Math.abs(i.quantity_change)
        return { ...i, quantity_change: sign * absQty }
      })
    : pendingItems.map(pi => ({
        id: pi.tempId,
        stock_adjustment_id: 0,
        product_id: pi.productId,
        product_name: pi.productName,
        product_sku: pi.productSku,
        product_category: pi.productCategory,
        quantity_change: (() => {
          const sign = pi.quantityChange >= 0 ? 1 : -1
          const absQty = parseFloat(pendingQtyEdits[pi.tempId] ?? String(Math.abs(pi.quantityChange))) || Math.abs(pi.quantityChange)
          return sign * absQty
        })(),
        current_stock: 0,
      }))

  const filteredDisplay = searchQuery
    ? displayItems.filter(i =>
        i.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.product_category ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayItems

  // Retraits qui dépassent le stock disponible
  const insufficientItems = isEdit
    ? displayItems.filter(i => i.quantity_change < 0 && i.current_stock + i.quantity_change < 0)
    : []

  const totalAdded   = displayItems.filter(i => i.quantity_change > 0).reduce((s, i) => s + i.quantity_change, 0)
  const totalRemoved = displayItems.filter(i => i.quantity_change < 0).reduce((s, i) => s + Math.abs(i.quantity_change), 0)

  // ── Ajouter un article ─────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!selectedProductId || !addQty || parseFloat(addQty) <= 0) return
    const product = allProducts.find(p => String(p.id) === selectedProductId)
    if (!product) return
    const absQty = parseFloat(addQty) || 1
    const quantityChange = addType === 'add' ? absQty : -absQty

    if (!isEdit) {
      const tempId = ++tempIdRef.current
      setPendingItems(prev => [...prev, {
        tempId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productCategory: product.category?.name ?? null,
        quantityChange,
      }])
      setPendingQtyEdits(prev => ({ ...prev, [tempId]: String(absQty) }))
    } else {
      try {
        const item = await addStockAdjustmentItem(id!, { product_id: product.id, quantity_change: quantityChange })
        setItems(prev => [...prev, item])
        setQtyEdits(prev => ({ ...prev, [item.id]: String(Math.abs(item.quantity_change)) }))
      } catch (err) { setError(getApiErrorMessage(err)) }
    }
    setSelectedProductId('')
    setAddQty('1')
  }

  // ── Supprimer un article ───────────────────────────────────────────────────
  async function handleRemoveItem(itemId: number) {
    if (!isEdit) {
      setPendingItems(prev => prev.filter(i => i.tempId !== itemId))
      setPendingQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
      return
    }
    try {
      await removeStockAdjustmentItem(id!, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
    } catch (err) { setError(getApiErrorMessage(err)) }
  }

  // ── Changer le type (ajout/retrait) d'un item existant ────────────────────
  async function handleToggleItemType(item: StockAdjustmentItem) {
    if (!isEdit || !isDraft) return
    const newChange = -item.quantity_change
    try {
      const updated = await updateStockAdjustmentItem(id!, item.id, { quantity_change: newChange })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setQtyEdits(prev => ({ ...prev, [updated.id]: String(Math.abs(updated.quantity_change)) }))
    } catch (err) { setError(getApiErrorMessage(err)) }
  }

  // ── Enregistrer ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!storeId) { setError('Veuillez sélectionner un magasin.'); return }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (!isEdit) {
        const a = await createStockAdjustment({
          store_id: Number(storeId),
          adjustment_date: adjustmentDate || null,
          note: note.trim() || null,
          items: pendingItems.map(pi => ({
            product_id: pi.productId,
            quantity_change: (() => {
              const sign = pi.quantityChange >= 0 ? 1 : -1
              const absQty = parseFloat(pendingQtyEdits[pi.tempId] ?? String(Math.abs(pi.quantityChange))) || Math.abs(pi.quantityChange)
              return sign * absQty
            })(),
          })),
        })
        navigate(`/stock-adjustments/${a.id}/edit`, { replace: true })
      } else {
        await updateStockAdjustment(id!, {
          store_id: Number(storeId),
          adjustment_date: adjustmentDate || null,
          note: note.trim() || null,
        })
        // Sync qty edits
        await Promise.all(
          items
            .filter(i => qtyEdits[i.id] !== undefined)
            .map(i => {
              const sign = i.quantity_change >= 0 ? 1 : -1
              const absQty = parseFloat(qtyEdits[i.id]) || Math.abs(i.quantity_change)
              return updateStockAdjustmentItem(id!, i.id, { quantity_change: sign * absQty })
            })
        )
        const refreshed = await fetchStockAdjustment(id!)
        setItems(refreshed.items ?? [])
        setQtyEdits(prev => {
          const edits: Record<number, string> = {}
          ;(refreshed.items ?? []).forEach(i => { edits[i.id] = prev[i.id] ?? String(Math.abs(i.quantity_change)) })
          return edits
        })
        setSuccessMsg('Ajustement enregistré.')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Appliquer l'ajustement ─────────────────────────────────────────────────
  async function handleApply() {
    if (!window.confirm('Appliquer cet ajustement ? Le stock du magasin sera mis à jour immédiatement.')) return
    setApplying(true)
    setError(null)
    setApplyErrors([])
    setSuccessMsg(null)
    try {
      const updated = await applyStockAdjustment(id!)
      setStatus(updated.status)
      const refreshed = await fetchStockAdjustment(id!)
      setItems(refreshed.items ?? [])
      setSuccessMsg('Ajustement appliqué ! Le stock a été mis à jour.')
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; errors?: string[] } } }
      const data = apiErr?.response?.data
      if (data?.errors?.length) {
        setApplyErrors(data.errors)
        setError(data.message ?? 'Stock insuffisant.')
      } else {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setApplying(false)
    }
  }

  if (loadingMeta || loadingAdjustment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  const statusMeta = STATUS_META[status]
  const selectedStore = stores.find(s => String(s.id) === storeId)

  return (
    <div className=" space-y-6">

      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/stock-adjustments')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">
                {isEdit ? `Ajustement #${id!.padStart(4, '0')}` : 'Nouvel ajustement'}
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/stock-adjustments')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            {isEdit && isDraft && (
              <button
                type="button"
                onClick={() => void handleApply()}
                disabled={applying || saving || displayItems.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Appliquer l'ajustement
              </button>
            )}
            {isDraft && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className=" space-y-5 px-6 py-6">

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {applyErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Articles avec stock insuffisant :
            </p>
            <ul className="ml-4 list-disc space-y-1">
              {applyErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMsg}
          </div>
        )}

        {/* ══════════════════ EN-TÊTE ══════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-center gap-6 pt-8 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
              <PackagePlus className="h-8 w-8 text-[#0F2E4A]" />
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Magasin <span className="text-red-500">*</span>
                </label>
                <Sel value={storeId} onChange={e => setStoreId(e.target.value)} disabled={!isDraft}>
                  <option value="">— Sélectionner —</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Sel>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date de l'ajustement</label>
                <Inp type="date" value={adjustmentDate} onChange={e => setAdjustmentDate(e.target.value)} disabled={!isDraft} />
              </div>
            </div>

            {selectedStore && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
                <Package className="h-4 w-4 shrink-0" />
                Ajustement pour : <span className="font-semibold">{selectedStore.name}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Note / Motif</label>
              <Inp
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={!isDraft}
                placeholder="Motif de l'ajustement (inventaire, casse, don…)"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════ AJOUT D'ARTICLE ══════════════════════════════════ */}
        {isDraft && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Ajouter un article</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3">
                {/* Type */}
                <div className="w-36">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Type</label>
                  <Sel value={addType} onChange={e => setAddType(e.target.value as 'add' | 'remove')}>
                    <option value="add">Ajout (+)</option>
                    <option value="remove">Retrait (−)</option>
                  </Sel>
                </div>

                {/* Catégorie */}
                <div className="w-44">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Catégorie</label>
                  <Sel value={filterCategoryId} onChange={e => { setFilterCategoryId(e.target.value); setSelectedProductId('') }}>
                    <option value="">Toutes</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Sel>
                </div>

                {/* Produit */}
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Article <span className="text-red-500">*</span>
                  </label>
                  <Sel value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                  </Sel>
                </div>

                {/* Quantité */}
                <div className="w-32">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>
                  <Inp type="number" step="0.001" min="0.001" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="1" />
                </div>

                <button
                  type="button"
                  onClick={() => void handleAddItem()}
                  disabled={!selectedProductId}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TABLEAU DES ARTICLES ═════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3">
            <p className="text-sm font-semibold text-gray-700 mr-2">Articles</p>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-52 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
            <span className="ml-auto text-xs text-gray-400">
              {displayItems.length} article{displayItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock actuel</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Après ajustement</th>
                  {isDraft && <th className="w-10 px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDisplay.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 7 : 6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Package className="h-10 w-10" />
                        <span className="text-sm">Aucun article ajouté</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDisplay.map(item => {
                    const isAddition = item.quantity_change >= 0
                    const absQty     = Math.abs(item.quantity_change)
                    const afterStock = item.current_stock + item.quantity_change
                    const isInsufficient = isEdit && !isAddition && afterStock < 0

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isInsufficient ? 'bg-red-50/40' : ''}`}>
                        {/* Article */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isInsufficient && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                            <div>
                              <p className="font-medium text-gray-900">{item.product_name}</p>
                              {item.product_sku && <p className="text-xs text-gray-400">{item.product_sku}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Catégorie */}
                        <td className="px-4 py-3 text-gray-600">
                          {item.product_category ?? <span className="text-gray-400">—</span>}
                        </td>

                        {/* Stock actuel */}
                        <td className="px-4 py-3 text-right">
                          {isEdit
                            ? <span className="font-medium text-gray-700">{item.current_stock.toLocaleString('fr-FR')}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Type (badge + toggle) */}
                        <td className="px-4 py-3 text-center">
                          {isDraft && isEdit ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleItemType(item)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                isAddition
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                              title="Cliquer pour inverser"
                            >
                              {isAddition ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {isAddition ? 'Ajout' : 'Retrait'}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isAddition ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isAddition ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {isAddition ? 'Ajout' : 'Retrait'}
                            </span>
                          )}
                        </td>

                        {/* Quantité — éditable si draft */}
                        <td className="px-4 py-3 text-right">
                          {isDraft ? (
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={
                                isEdit
                                  ? (qtyEdits[item.id] ?? String(absQty))
                                  : (pendingQtyEdits[item.id] ?? String(absQty))
                              }
                              onChange={e => {
                                if (isEdit) {
                                  setQtyEdits(prev => ({ ...prev, [item.id]: e.target.value }))
                                } else {
                                  setPendingQtyEdits(prev => ({ ...prev, [item.id]: e.target.value }))
                                }
                              }}
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                            />
                          ) : (
                            <span className="font-semibold text-gray-800">{absQty.toLocaleString('fr-FR')}</span>
                          )}
                        </td>

                        {/* Après ajustement */}
                        <td className="px-4 py-3 text-right">
                          {isEdit ? (
                            <span className={`font-semibold ${afterStock < 0 ? 'text-red-600' : isAddition ? 'text-green-600' : 'text-gray-700'}`}>
                              {afterStock.toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {isDraft && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => void handleRemoveItem(item.id)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Avertissement stock insuffisant */}
          {isEdit && insufficientItems.length > 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-6 py-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {insufficientItems.length} article{insufficientItems.length > 1 ? 's' : ''} avec un stock insuffisant —
              l'application sera bloquée.
            </div>
          )}

          {/* Résumé */}
          {displayItems.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {displayItems.length} article{displayItems.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4">
                {totalAdded > 0 && (
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <Plus className="h-3.5 w-3.5" />
                    {totalAdded.toLocaleString('fr-FR')} ajouté{totalAdded !== 1 ? 's' : ''}
                  </span>
                )}
                {totalRemoved > 0 && (
                  <span className="flex items-center gap-1 font-medium text-red-600">
                    <Minus className="h-3.5 w-3.5" />
                    {totalRemoved.toLocaleString('fr-FR')} retiré{totalRemoved !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
