import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, ChevronDown, Loader2, Package,
  Plus, Save, ShoppingCart, Store, Trash2,
} from 'lucide-react'
import {
  fetchPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
  addPurchaseOrderItem, updatePurchaseOrderItem, removePurchaseOrderItem,
  fetchPurchasingCenters,
} from '../../api/purchaseOrders'
import { fetchSuppliers } from '../../api/suppliers'
import { fetchStores } from '../../api/stores'
import { fetchProducts } from '../../api/products'
import { fetchItemCategories } from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory, Product, PurchaseOrderItem, PurchaseOrderStatus, Store as StoreType, Supplier } from '../../types/api'
import Can from '../../components/Can'

// ── Tiny primitives ───────────────────────────────────────────────────────────

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 ${props.className ?? ''}`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 ${props.className ?? ''}`}
    />
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:              { label: 'Brouillon',             className: 'bg-gray-100 text-gray-600' },
  submitted:          { label: 'Soumise',               className: 'bg-purple-100 text-purple-700' },
  confirmed:          { label: 'Confirmée (centrale)',   className: 'bg-indigo-100 text-indigo-700' },
  validated:          { label: 'Validée',               className: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partiell. reçue',       className: 'bg-amber-100 text-amber-700' },
  completed:          { label: 'Terminée',              className: 'bg-green-100 text-green-700' },
}

// ── Pending item (create mode) ────────────────────────────────────────────────

interface PendingItem {
  tempId: number
  productId: number
  productName: string
  productSku: string | null
  productCategory: string | null
  currentStock: number
  quantity: number
  unitCost: number
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isCentral?: boolean
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderForm({ isCentral = false }: Props) {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  // meta
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchasingCenters, setPurchasingCenters] = useState<StoreType[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingOrder, setLoadingOrder] = useState(isEdit)

  // header fields
  const [supplierId, setSupplierId] = useState('')
  const [purchasingCenterId, setPurchasingCenterId] = useState('')
  const [orderIsCentral, setOrderIsCentral] = useState(isCentral)
  const [storeId, setStoreId] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [note, setNote] = useState('')
  const [discountPct, setDiscountPct] = useState('0')
  const [extraFees, setExtraFees] = useState('0')
  const [status, setStatus] = useState<PurchaseOrderStatus>('validated')

  // items (edit mode: from API)
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [itemEdits, setItemEdits] = useState<Record<number, { quantity: string; unit_cost: string }>>({})

  // pending items (create mode: local)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [pendingEdits, setPendingEdits] = useState<Record<number, { quantity: string; unit_cost: string }>>({})
  const tempIdRef = useRef(0)

  // add-item form
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [addQty, setAddQty] = useState('1')
  const [addCost, setAddCost] = useState('')

  // search / filter on items table
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBy, setSearchBy] = useState<'name' | 'category'>('name')

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const canEdit = !isEdit
    ? true
    : orderIsCentral
      ? status === 'draft' || status === 'submitted' || status === 'confirmed'
      : status !== 'completed'

  // ── Load meta ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchSuppliers(1),
      fetchStores(1),
      fetchProducts(1),
      fetchItemCategories(1),
      fetchPurchasingCenters(),
    ])
      .then(([sups, strs, prods, cats, centers]) => {
        setSuppliers(sups.data)
        setStores(strs.data)
        setAllProducts(prods.data)
        setCategories(cats.data)
        setPurchasingCenters(centers)
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false))
  }, [])

  // ── Load order (edit mode) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    fetchPurchaseOrder(id!)
      .then(order => {
        const central = order.purchasing_center_id !== null
        setOrderIsCentral(central)
        setSupplierId(order.supplier_id ? String(order.supplier_id) : '')
        setPurchasingCenterId(order.purchasing_center_id ? String(order.purchasing_center_id) : '')
        setStoreId(String(order.store_id))
        setOrderDate(order.order_date ?? '')
        setExpectedDate(order.expected_date ?? '')
        setNote(order.note ?? '')
        setDiscountPct(String(order.discount_percentage))
        setExtraFees(String(order.extra_fees))
        setStatus(order.status)
        const its = order.items ?? []
        setItems(its)
        const edits: Record<number, { quantity: string; unit_cost: string }> = {}
        its.forEach(i => { edits[i.id] = { quantity: String(i.quantity), unit_cost: String(i.unit_cost) } })
        setItemEdits(edits)
      })
      .catch(() => setError('Impossible de charger la commande.'))
      .finally(() => setLoadingOrder(false))
  }, [id, isEdit])

  // ── Recharger les produits avec stock par magasin quand le magasin change ───
  useEffect(() => {
    if (!storeId) return
    fetchProducts({ page: 1, store_id: Number(storeId) })
      .then(prods => setAllProducts(prods.data))
      .catch(console.error)
  }, [storeId])

  // ── When product is selected in add form → prefill cost ──────────────────────
  useEffect(() => {
    if (!selectedProductId) { setAddCost(''); return }
    const p = allProducts.find(x => String(x.id) === selectedProductId)
    if (p) setAddCost(p.purchase_price != null ? String(p.purchase_price) : '0')
  }, [selectedProductId, allProducts])

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

  // ── Filtered products by category ───────────────────────────────────────────
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

  // ── Active display items ─────────────────────────────────────────────────────
  const displayItems: PurchaseOrderItem[] = isEdit
    ? items.map(i => ({
        ...i,
        quantity: parseFloat(itemEdits[i.id]?.quantity ?? String(i.quantity)),
        unit_cost: parseFloat(itemEdits[i.id]?.unit_cost ?? String(i.unit_cost)),
        total: parseFloat(itemEdits[i.id]?.quantity ?? String(i.quantity)) *
               parseFloat(itemEdits[i.id]?.unit_cost ?? String(i.unit_cost)),
      }))
    : pendingItems.map(pi => ({
        id: pi.tempId,
        purchase_order_id: 0,
        product_id: pi.productId,
        product_name: pi.productName,
        product_sku: pi.productSku,
        product_category: pi.productCategory,
        current_stock: pi.currentStock,
        quantity: parseFloat(pendingEdits[pi.tempId]?.quantity ?? String(pi.quantity)),
        received_quantity: 0,
        remaining_quantity: parseFloat(pendingEdits[pi.tempId]?.quantity ?? String(pi.quantity)),
        unit_cost: parseFloat(pendingEdits[pi.tempId]?.unit_cost ?? String(pi.unitCost)),
        total: parseFloat(pendingEdits[pi.tempId]?.quantity ?? String(pi.quantity)) *
               parseFloat(pendingEdits[pi.tempId]?.unit_cost ?? String(pi.unitCost)),
      }))

  const filteredDisplayItems = displayItems.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return searchBy === 'name'
      ? i.product_name.toLowerCase().includes(q)
      : (i.product_category ?? '').toLowerCase().includes(q)
  })

  // ── Totals ───────────────────────────────────────────────────────────────────
  const subtotal = displayItems.reduce((s, i) => s + i.total, 0)
  const discount = subtotal * (parseFloat(discountPct) || 0) / 100
  const total = subtotal - discount + (parseFloat(extraFees) || 0)

  // ── Add item ─────────────────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!selectedProductId || !addQty || parseFloat(addQty) <= 0) return
    const product = allProducts.find(p => String(p.id) === selectedProductId)
    if (!product) return
    const qty = parseFloat(addQty) || 1
    const cost = parseFloat(addCost) || 0

    // Réinitialiser immédiatement pour éviter les doubles soumissions
    setSelectedProductId('')
    setProductSearchQuery('')
    setShowProductDropdown(false)
    setAddQty('1')
    setAddCost('')

    if (!isEdit) {
      const existingPending = pendingItems.find(pi => pi.productId === product.id)
      if (existingPending) {
        const currentQty = parseFloat(pendingEdits[existingPending.tempId]?.quantity ?? String(existingPending.quantity)) || 0
        setPendingEdits(prev => ({
          ...prev,
          [existingPending.tempId]: { ...prev[existingPending.tempId], quantity: String(currentQty + qty) },
        }))
      } else {
        const tempId = ++tempIdRef.current
        const currentStock = product.store_stock_quantity != null
          ? product.store_stock_quantity
          : Number(product.stock_quantity) || 0
        setPendingItems(prev => [...prev, {
          tempId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category?.name ?? null,
          currentStock,
          quantity: qty,
          unitCost: cost,
        }])
        setPendingEdits(prev => ({ ...prev, [tempId]: { quantity: String(qty), unit_cost: String(cost) } }))
      }
    } else {
      const existingItem = items.find(i => i.product_id === product.id)
      if (existingItem) {
        const currentQty = parseFloat(itemEdits[existingItem.id]?.quantity ?? String(existingItem.quantity)) || 0
        setItemEdits(prev => ({
          ...prev,
          [existingItem.id]: { ...prev[existingItem.id], quantity: String(currentQty + qty) },
        }))
      } else {
        try {
          const item = await addPurchaseOrderItem(id!, { product_id: product.id, quantity: qty, unit_cost: cost })
          setItems(prev => [...prev, item])
          setItemEdits(prev => ({ ...prev, [item.id]: { quantity: String(item.quantity), unit_cost: String(item.unit_cost) } }))
        } catch (err) { setError(getApiErrorMessage(err)) }
      }
    }
  }

  // ── Remove item ──────────────────────────────────────────────────────────────
  async function handleRemoveItem(itemId: number) {
    if (!isEdit) {
      setPendingItems(prev => prev.filter(i => i.tempId !== itemId))
      setPendingEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
      return
    }
    try {
      await removePurchaseOrderItem(id!, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setItemEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
    } catch (err) { setError(getApiErrorMessage(err)) }
  }

  // ── Main save ────────────────────────────────────────────────────────────────
  async function handleSave(action: 'draft' | 'submit' = 'submit') {
    if (orderIsCentral && !purchasingCenterId) {
      setError('Veuillez sélectionner une centrale d\'achat.')
      return
    }
    if (!orderIsCentral && !supplierId) {
      setError('Veuillez sélectionner un fournisseur.')
      return
    }
    if (!storeId) { setError('Veuillez sélectionner un magasin.'); return }

    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (!isEdit) {
        const itemsPayload = pendingItems.map(pi => ({
          product_id: pi.productId,
          quantity: parseFloat(pendingEdits[pi.tempId]?.quantity ?? String(pi.quantity)) || pi.quantity,
          unit_cost: parseFloat(pendingEdits[pi.tempId]?.unit_cost ?? String(pi.unitCost)) || pi.unitCost,
        }))
        const order = await createPurchaseOrder({
          supplier_id: orderIsCentral ? null : Number(supplierId),
          purchasing_center_id: orderIsCentral ? Number(purchasingCenterId) : null,
          store_id: Number(storeId),
          order_date: orderDate || null,
          expected_date: expectedDate || null,
          note: note.trim() || null,
          discount_percentage: parseFloat(discountPct) || 0,
          extra_fees: parseFloat(extraFees) || 0,
          action: orderIsCentral ? action : undefined,
          items: itemsPayload,
        })
        navigate(`/${orderIsCentral ? 'central-orders' : 'purchase-orders'}/${order.id}`, { replace: true })
      } else {
        await updatePurchaseOrder(id!, {
          supplier_id: orderIsCentral ? null : Number(supplierId),
          purchasing_center_id: orderIsCentral ? Number(purchasingCenterId) : null,
          store_id: Number(storeId),
          order_date: orderDate || null,
          expected_date: expectedDate || null,
          note: note.trim() || null,
          discount_percentage: parseFloat(discountPct) || 0,
          extra_fees: parseFloat(extraFees) || 0,
        })
        await Promise.all(
          items
            .filter(i => itemEdits[i.id])
            .map(i =>
              updatePurchaseOrderItem(id!, i.id, {
                quantity: parseFloat(itemEdits[i.id].quantity) || i.quantity,
                unit_cost: parseFloat(itemEdits[i.id].unit_cost) || i.unit_cost,
              })
            )
        )
        setSuccessMsg('Commande enregistrée.')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loadingMeta || loadingOrder) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.validated
  const formTitle = isEdit
    ? `Commande #${id!.padStart(4, '0')}`
    : orderIsCentral
      ? 'Commande centrale d\'achat'
      : 'Nouvelle commande fournisseur'

  return (
    <div className=" space-y-6">

      {/* ── Sticky header ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(orderIsCentral ? '/central-orders' : '/purchase-orders')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">{formTitle}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(orderIsCentral ? '/central-orders' : '/purchase-orders')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            {isEdit && canEdit && (
              <button
                type="button"
                onClick={() => navigate(`/${orderIsCentral ? 'central-orders' : 'purchase-orders'}/${id!}`)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Réceptionner
              </button>
            )}
            {canEdit && !isEdit && orderIsCentral ? (
              <>
                <Can code="admin_panel.orders.create_or_edit">
                  <button
                    type="button"
                    onClick={() => void handleSave('draft')}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Créer (brouillon)
                  </button>
                </Can>
                <Can code="admin_panel.orders.submit">
                  <button
                    type="button"
                    onClick={() => void handleSave('submit')}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Soumettre
                  </button>
                </Can>
              </>
            ) : canEdit && (
              <Can code="admin_panel.orders.create_or_edit">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </Can>
            )}
          </div>
        </div>
      </div>

      <div className=" space-y-5 px-6 py-6">

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMsg}</div>
        )}

        {/* ══════════════════ SECTION EN-TÊTE ══════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex justify-center pt-8 pb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF6FF]">
              {orderIsCentral
                ? <Store className="h-10 w-10 text-[#0F2E4A]" />
                : <ShoppingCart className="h-10 w-10 text-[#0F2E4A]" />
              }
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Centrale d'achat ou Fournisseur */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {orderIsCentral ? 'Centrale d\'achat' : 'Fournisseur'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                {orderIsCentral ? (
                  <Sel value={purchasingCenterId} onChange={e => setPurchasingCenterId(e.target.value)} disabled={!canEdit}>
                    <option value="">— Choisir une centrale —</option>
                    {purchasingCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Sel>
                ) : (
                  <Sel value={supplierId} onChange={e => setSupplierId(e.target.value)} disabled={!canEdit}>
                    <option value="">— Choisir un fournisseur —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Sel>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Magasin destinataire <span className="text-red-500">*</span>
                </label>
                <Sel value={storeId} onChange={e => setStoreId(e.target.value)} disabled={!canEdit}>
                  <option value="">— Choisir un magasin —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date de la commande</label>
                <Inp type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date prévue</label>
                <Inp type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} disabled={!canEdit} />
              </div>
            </div>

            {/* Remarque */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Remarque</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={!canEdit}
                rows={2}
                placeholder="Notes, conditions…"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════ AJOUT D'ARTICLE ══════════════════════════════════ */}
        {canEdit && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Ajout d'article</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Catégorie</label>
                  <Sel value={filterCategoryId} onChange={e => { setFilterCategoryId(e.target.value); setSelectedProductId(''); setProductSearchQuery('') }}>
                    <option value="">Toutes</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Sel>
                </div>
                <div className="flex-1 min-w-[200px] relative" data-product-dropdown>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">
                    Produit <span className="text-red-500">*</span>
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
                <div className="w-28">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>
                  <Inp type="number" min="0.001" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="1" />
                </div>
                <div className="w-36">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Coût unitaire (CFA)</label>
                  <Inp type="number" min="0" value={addCost} onChange={e => setAddCost(e.target.value)} placeholder="0.00" />
                </div>
                <Can code="admin_panel.orders.create_or_edit">
                  <button
                    type="button"
                    onClick={() => void handleAddItem()}
                    disabled={!selectedProductId}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </button>
                </Can>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ LISTE D'ARTICLES ═════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-sm font-semibold text-gray-700">Liste d'articles</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 px-6 py-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Recherche…"
              className="w-52 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">Recherche par</span>
              {(['name', 'category'] as const).map(opt => (
                <label key={opt} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="search-by"
                    checked={searchBy === opt}
                    onChange={() => setSearchBy(opt)}
                    className="h-3.5 w-3.5 accent-[#0F2E4A]"
                  />
                  {opt === 'name' ? 'nom' : 'catégorie'}
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Noms</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock dispo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock commandé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock livré</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock restant</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Coût</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  {canEdit && <th className="w-10 px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDisplayItems.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Package className="h-10 w-10" />
                        <span className="text-sm">aucune donnée disponible</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDisplayItems.map(item => {
                    const edits = isEdit ? itemEdits[item.id] : pendingEdits[item.id]
                    const currentQty = edits?.quantity ?? String(item.quantity)
                    const currentCost = edits?.unit_cost ?? String(item.unit_cost)

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          {item.product_sku && <p className="text-xs text-gray-400">{item.product_sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.product_category ?? <span className="text-gray-400">—</span>}
                        </td>

                        {/* Stock dispo */}
                        <td className="px-4 py-3 text-right">
                          {storeId
                            ? <span className="text-gray-700">{item.current_stock.toLocaleString('fr-FR')}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Stock commandé — éditable */}
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <input
                              type="number" min="0.001"
                              value={currentQty}
                              onChange={e => {
                                if (isEdit) {
                                  setItemEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: e.target.value } }))
                                } else {
                                  setPendingEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: e.target.value } }))
                                }
                              }}
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                            />
                          ) : (
                            <span className="font-medium text-gray-700">{item.quantity.toLocaleString('fr-FR')}</span>
                          )}
                        </td>

                        {/* Stock livré */}
                        <td className="px-4 py-3 text-right">
                          {isEdit
                            ? <span className={`font-medium ${item.received_quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {item.received_quantity.toLocaleString('fr-FR')}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Stock restant */}
                        <td className="px-4 py-3 text-right">
                          {isEdit
                            ? <span className={`font-medium ${item.remaining_quantity <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                {item.remaining_quantity <= 0 ? '✓' : item.remaining_quantity.toLocaleString('fr-FR')}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Coût */}
                        <td className="px-4 py-3 text-right">
                          {canEdit ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number" min="0"
                                value={currentCost}
                                onChange={e => {
                                  if (isEdit) {
                                    setItemEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], unit_cost: e.target.value } }))
                                  } else {
                                    setPendingEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], unit_cost: e.target.value } }))
                                  }
                                }}
                                className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                              />
                              <span className="text-xs text-gray-400">CFA</span>
                            </div>
                          ) : (
                            <span>{item.unit_cost.toLocaleString('fr-FR')} CFA</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {((parseFloat(currentQty) || 0) * (parseFloat(currentCost) || 0)).toLocaleString('fr-FR')} CFA
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-center">
                            <Can code="admin_panel.orders.create_or_edit">
                              <button
                                type="button"
                                onClick={() => void handleRemoveItem(item.id)}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Can>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap gap-4">
                <div className="w-52">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Réduction (%)</label>
                  <Inp type="number" min="0" max="100" value={discountPct}
                    onChange={e => setDiscountPct(e.target.value)} disabled={!canEdit} placeholder="0" />
                </div>
                <div className="w-52">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Frais supplémentaires (CFA)</label>
                  <Inp type="number" min="0" value={extraFees}
                    onChange={e => setExtraFees(e.target.value)} disabled={!canEdit} placeholder="0" />
                </div>
              </div>
              <div className="min-w-[220px] space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span className="font-medium">{subtotal.toLocaleString('fr-FR')} CFA</span>
                </div>
                {(parseFloat(discountPct) || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise ({discountPct}%)</span>
                    <span>−{discount.toLocaleString('fr-FR')} CFA</span>
                  </div>
                )}
                {(parseFloat(extraFees) || 0) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Frais suppl.</span>
                    <span>+{parseFloat(extraFees).toLocaleString('fr-FR')} CFA</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{total.toLocaleString('fr-FR')} CFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
