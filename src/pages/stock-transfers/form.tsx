import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check,
  ChevronDown, Loader2, Package, Plus, Save, Shuffle, Trash2,
} from 'lucide-react'
import {
  fetchStockTransfer, createStockTransfer, updateStockTransfer,
  addStockTransferItem, updateStockTransferItem, removeStockTransferItem,
  confirmStockTransfer,
} from '../../api/stockTransfers'
import { fetchStores } from '../../api/stores'
import { fetchProducts } from '../../api/products'
import { fetchItemCategories } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory, Product, StockTransferItem, Store } from '../../types/api'

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

// ── Pending item (mode création) ──────────────────────────────────────────────

interface PendingItem {
  tempId: number
  productId: number
  productName: string
  productSku: string | null
  productCategory: string | null
  quantity: number
}

// ── Statuts ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'Soumis',     className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Validé',     className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé',     className: 'bg-red-100 text-red-600' },
} as const

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StockTransferForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  // meta
  const [stores, setStores] = useState<Store[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingTransfer, setLoadingTransfer] = useState(isEdit)

  // header
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'draft' | 'submitted' | 'confirmed' | 'cancelled'>('submitted')
  const [canValidate, setCanValidate] = useState(false)

  // items (edit mode : depuis l'API)
  const [items, setItems] = useState<StockTransferItem[]>([])
  const [qtyEdits, setQtyEdits] = useState<Record<number, string>>({})

  // pending items (create mode : local)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [pendingQtyEdits, setPendingQtyEdits] = useState<Record<number, string>>({})
  const tempIdRef = useRef(0)

  // add-item form
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [addQty, setAddQty] = useState('1')

  // search
  const [searchQuery, setSearchQuery] = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmErrors, setConfirmErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isDraft = status === 'draft' || status === 'submitted'

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

  // ── Load transfer (edit mode) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    fetchStockTransfer(id!)
      .then(t => {
        setFromStoreId(String(t.from_store_id))
        setToStoreId(String(t.to_store_id))
        setTransferDate(t.transfer_date ?? '')
        setNote(t.note ?? '')
        setStatus(t.status)
        setCanValidate(t.can_validate ?? false)
        const its = t.items ?? []
        setItems(its)
        const edits: Record<number, string> = {}
        its.forEach(i => { edits[i.id] = String(i.quantity) })
        setQtyEdits(edits)
      })
      .catch(() => setError('Impossible de charger le transfert.'))
      .finally(() => setLoadingTransfer(false))
  }, [id, isEdit])

  // ── Fermer le dropdown quand on clique en dehors ─────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const productDropdown = target.closest('[data-product-dropdown]')
      if (!productDropdown && showProductDropdown) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProductDropdown])

  // ── Produits filtrés ───────────────────────────────────────────────────────
  const filteredProducts = allProducts.filter(p => {
    if (filterCategoryId && String(p.item_category_id) !== filterCategoryId) return false
    if (productSearchQuery) {
      const q = productSearchQuery.toLowerCase()
      const matchesName = p.name.toLowerCase().includes(q)
      const matchesSku = p.sku?.toLowerCase().includes(q)
      if (!matchesName && !matchesSku) return false
    }
    return true
  })

  // ── Items à afficher ───────────────────────────────────────────────────────
  const displayItems: StockTransferItem[] = isEdit
    ? items.map(i => ({
        ...i,
        quantity: parseFloat(qtyEdits[i.id] ?? String(i.quantity)) || i.quantity,
      }))
    : pendingItems.map(pi => ({
        id: pi.tempId,
        stock_transfer_id: 0,
        product_id: pi.productId,
        product_name: pi.productName,
        product_sku: pi.productSku,
        product_category: pi.productCategory,
        quantity: parseFloat(pendingQtyEdits[pi.tempId] ?? String(pi.quantity)) || pi.quantity,
        stock_from: 0,
        stock_to: 0,
      }))

  const filteredDisplay = searchQuery
    ? displayItems.filter(i => i.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || (i.product_category ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    : displayItems

  // Validation : stock source insuffisant
  const insufficientItems = isEdit
    ? displayItems.filter(i => {
        const qty = parseFloat(qtyEdits[i.id] ?? String(i.quantity)) || i.quantity
        return i.stock_from < qty
      })
    : []

  const totalQty = displayItems.reduce((s, i) => s + i.quantity, 0)

  // ── Ajouter un article ─────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!selectedProductId || !addQty || parseFloat(addQty) <= 0) return
    const product = allProducts.find(p => String(p.id) === selectedProductId)
    if (!product) return
    const qty = parseFloat(addQty) || 1

    // Réinitialiser immédiatement pour éviter les doubles soumissions
    setSelectedProductId('')
    setProductSearchQuery('')
    setShowProductDropdown(false)
    setAddQty('1')

    if (!isEdit) {
      const existingPending = pendingItems.find(pi => pi.productId === product.id)
      if (existingPending) {
        const currentQty = parseFloat(pendingQtyEdits[existingPending.tempId] ?? String(existingPending.quantity)) || 0
        setPendingQtyEdits(prev => ({ ...prev, [existingPending.tempId]: String(currentQty + qty) }))
      } else {
        const tempId = ++tempIdRef.current
        setPendingItems(prev => [...prev, {
          tempId, productId: product.id,
          productName: product.name, productSku: product.sku,
          productCategory: product.category?.name ?? null, quantity: qty,
        }])
        setPendingQtyEdits(prev => ({ ...prev, [tempId]: String(qty) }))
      }
    } else {
      const existingItem = items.find(i => i.product_id === product.id)
      if (existingItem) {
        const currentQty = parseFloat(qtyEdits[existingItem.id] ?? String(existingItem.quantity)) || 0
        setQtyEdits(prev => ({ ...prev, [existingItem.id]: String(currentQty + qty) }))
      } else {
        try {
          const item = await addStockTransferItem(id!, { product_id: product.id, quantity: qty })
          setItems(prev => [...prev, item])
          setQtyEdits(prev => ({ ...prev, [item.id]: String(item.quantity) }))
        } catch (err) { setError(getApiErrorMessage(err)) }
      }
    }
  }

  // ── Supprimer un article ───────────────────────────────────────────────────
  async function handleRemoveItem(itemId: number) {
    if (!isEdit) {
      setPendingItems(prev => prev.filter(i => i.tempId !== itemId))
      setPendingQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
      return
    }
    try {
      await removeStockTransferItem(id!, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setQtyEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
    } catch (err) { setError(getApiErrorMessage(err)) }
  }

  // ── Enregistrer ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!fromStoreId) { setError('Veuillez sélectionner le magasin source.'); return }
    if (!toStoreId)   { setError('Veuillez sélectionner le magasin destination.'); return }
    if (fromStoreId === toStoreId) { setError('Les magasins source et destination doivent être différents.'); return }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (!isEdit) {
        const t = await createStockTransfer({
          from_store_id: Number(fromStoreId),
          to_store_id: Number(toStoreId),
          transfer_date: transferDate || null,
          note: note.trim() || null,
          items: pendingItems.map(pi => ({
            product_id: pi.productId,
            quantity: parseFloat(pendingQtyEdits[pi.tempId] ?? String(pi.quantity)) || pi.quantity,
          })),
        })
        navigate(`/stock-transfers/${t.id}/edit`, { replace: true })
      } else {
        await updateStockTransfer(id!, {
          from_store_id: Number(fromStoreId),
          to_store_id: Number(toStoreId),
          transfer_date: transferDate || null,
          note: note.trim() || null,
        })
        // Sync qty edits
        await Promise.all(
          items
            .filter(i => qtyEdits[i.id] !== undefined)
            .map(i => updateStockTransferItem(id!, i.id, {
              quantity: parseFloat(qtyEdits[i.id]) || i.quantity,
            }))
        )
        // Rafraîchir les stocks affichés
        const refreshed = await fetchStockTransfer(id!)
        setItems(refreshed.items ?? [])
        setQtyEdits(prev => {
          const edits: Record<number, string> = {}
          ;(refreshed.items ?? []).forEach(i => { edits[i.id] = prev[i.id] ?? String(i.quantity) })
          return edits
        })
        setSuccessMsg('Transfert enregistré.')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Confirmer le transfert ─────────────────────────────────────────────────
  async function handleConfirm() {
    if (!window.confirm('Valider ce transfert ? Les stocks des deux magasins seront mis à jour.')) return
    setConfirming(true)
    setError(null)
    setConfirmErrors([])
    setSuccessMsg(null)
    try {
      const updated = await confirmStockTransfer(id!)
      setStatus(updated.status)
      // Rafraîchir les items avec les nouveaux stocks
      const refreshed = await fetchStockTransfer(id!)
      setItems(refreshed.items ?? [])
      setSuccessMsg('Transfert validé ! Les stocks ont été mis à jour.')
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; errors?: string[] } } }
      const data = apiErr?.response?.data
      if (data?.errors?.length) {
        setConfirmErrors(data.errors)
        setError(data.message ?? 'Stock insuffisant.')
      } else {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setConfirming(false)
    }
  }

  if (loadingMeta || loadingTransfer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  const statusMeta = STATUS_META[status]
  const fromStore = stores.find(s => String(s.id) === fromStoreId)
  const toStore   = stores.find(s => String(s.id) === toStoreId)

  return (
    <div className=" space-y-6">

      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/stock-transfers')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">
                {isEdit ? `Transfert #${id!.padStart(4, '0')}` : 'Nouveau transfert'}
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/stock-transfers')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            {/* Valider (seulement edit + soumis + droits de validation) */}
            {isEdit && status === 'submitted' && canValidate && (
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={confirming || saving || displayItems.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Valider le transfert
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
        {confirmErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Articles avec stock insuffisant :
            </p>
            <ul className="ml-4 list-disc space-y-1">
              {confirmErrors.map((e, i) => <li key={i}>{e}</li>)}
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
          {/* Icône + flèche de transfert */}
          <div className="flex items-center justify-center gap-6 pt-8 pb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Package className="h-8 w-8 text-[#0F2E4A]" />
            </div>
            <Shuffle className="h-8 w-8 text-[#3B82F6]" />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Package className="h-8 w-8 text-[#3B82F6]" />
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Magasin source + destination */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Magasin source <span className="text-red-500">*</span>
                </label>
                <Sel value={fromStoreId} onChange={e => setFromStoreId(e.target.value)} disabled={!isDraft}>
                  <option value="">— Sélectionner —</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id} disabled={String(s.id) === toStoreId}>
                      {s.name}
                    </option>
                  ))}
                </Sel>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Magasin destination <span className="text-red-500">*</span>
                </label>
                <Sel value={toStoreId} onChange={e => setToStoreId(e.target.value)} disabled={!isDraft}>
                  <option value="">— Sélectionner —</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id} disabled={String(s.id) === fromStoreId}>
                      {s.name}
                    </option>
                  ))}
                </Sel>
              </div>
            </div>

            {/* Aperçu source → dest */}
            {fromStore && toStore && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
                <span>{fromStore.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
                <span>{toStore.name}</span>
              </div>
            )}

            {/* Date + Note */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date du transfert</label>
                <Inp type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} disabled={!isDraft} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Note</label>
                <Inp
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={!isDraft}
                  placeholder="Motif du transfert…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════ AJOUT D'ARTICLE ══════════════════════════════════ */}
        {isDraft && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Ajouter un article</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3">
                {/* Catégorie */}
                <div className="w-44">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Catégorie</label>
                  <Sel value={filterCategoryId} onChange={e => { setFilterCategoryId(e.target.value); setSelectedProductId(''); setProductSearchQuery('') }}>
                    <option value="">Toutes</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Sel>
                </div>

                {/* Produit */}
                <div className="flex-1 min-w-[200px] relative" data-product-dropdown>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Article <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedProductId ? (allProducts.find(p => String(p.id) === selectedProductId)?.name || '') : ''}
                    readOnly
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    placeholder="Sélectionner un produit..."
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 cursor-pointer bg-white"
                  />
                  {showProductDropdown && (
                    <div className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                        <input
                          type="text"
                          value={productSearchQuery}
                          onChange={e => setProductSearchQuery(e.target.value)}
                          placeholder="Rechercher un produit..."
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                          autoFocus
                        />
                      </div>
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(String(p.id))
                            setProductSearchQuery('')
                            setShowProductDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.sku && <div className="text-xs text-gray-500">SKU: {p.sku}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantité */}
                <div className="w-32">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>
                  <Inp type="number" min="0.001" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="1" />
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
          {/* Barre de recherche */}
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
              {displayItems.length} article{displayItems.length !== 1 ? 's' : ''} · {totalQty.toLocaleString('fr-FR')} unité{totalQty !== 1 ? 's' : ''} au total
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    Stock source{fromStore ? <span className="ml-1 normal-case font-normal text-gray-400">({fromStore.name})</span> : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Transféré</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    Stock dest.{toStore ? <span className="ml-1 normal-case font-normal text-gray-400">({toStore.name})</span> : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Après transfert</th>
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
                    const qty = item.quantity
                    const afterFrom = item.stock_from - qty
                    const afterTo   = item.stock_to   + qty
                    const isInsufficient = isEdit && item.stock_from < qty

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

                        {/* Stock source */}
                        <td className="px-4 py-3 text-right">
                          {isEdit
                            ? <span className={`font-medium ${isInsufficient ? 'text-red-600' : 'text-gray-700'}`}>
                                {item.stock_from.toLocaleString('fr-FR')}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Quantité transférée — éditable si draft */}
                        <td className="px-4 py-3 text-right">
                          {isDraft ? (
                            <input
                              type="number"
                              min="0.001"
                              value={isEdit ? (qtyEdits[item.id] ?? String(item.quantity)) : (pendingQtyEdits[item.id] ?? String(item.quantity))}
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
                            <span className="font-semibold text-gray-800">{qty.toLocaleString('fr-FR')}</span>
                          )}
                        </td>

                        {/* Stock destination actuel */}
                        <td className="px-4 py-3 text-right">
                          {isEdit
                            ? <span className="text-gray-600">{item.stock_to.toLocaleString('fr-FR')}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Après transfert (source → dest) */}
                        <td className="px-4 py-3 text-right">
                          {isEdit ? (
                            <div className="flex flex-col items-end gap-0.5 text-xs">
                              <span className={`font-semibold ${afterFrom < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                {afterFrom.toLocaleString('fr-FR')} ↑ src
                              </span>
                              <span className="text-green-600 font-semibold">
                                {afterTo.toLocaleString('fr-FR')} ↓ dest
                              </span>
                            </div>
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

          {/* Avertissement si stock insuffisant */}
          {isEdit && insufficientItems.length > 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-6 py-3 text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {insufficientItems.length} article{insufficientItems.length > 1 ? 's' : ''} avec un stock source insuffisant —
              la confirmation sera bloquée.
            </div>
          )}

          {/* Résumé */}
          {displayItems.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {displayItems.length} article{displayItems.length !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-gray-800">
                Total transféré : {totalQty.toLocaleString('fr-FR')} unité{totalQty !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
