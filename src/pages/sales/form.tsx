import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ChevronDown, FileText, Loader2,
  Plus, Receipt, Save, ShoppingBag, Trash2,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import {
  fetchSale, createSale, updateSale,
  addSaleItem, removeSaleItem,
} from '../../api/sales'
import { fetchStores } from '../../api/stores'
import { fetchCashRegisters } from '../../api/cashRegisters'
import { fetchProducts } from '../../api/products'
import { fetchItemCategories } from '../../api/itemCategories'
import { fetchCustomers } from '../../api/customer'
import { fetchStorePaymentMethods } from '../../api/paymentMethods'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import SalePdf from './SalePdf'
import type { CashRegister, Customer, ItemCategory, PaymentMethod, Product, Sale, SaleItem, Store } from '../../types/api'

// ── Primitives ────────────────────────────────────────────────────────────────

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500 ${props.className ?? ''}`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500 ${props.className ?? ''}`}
    />
  )
}

// ── Types locaux ──────────────────────────────────────────────────────────────

interface PendingItem {
  tempId: number
  productId: number
  productName: string
  productSku: string | null
  productCategory: string | null
  quantity: number
  unitPrice: number
}

const STATUS_META = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
} as const

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SaleForm() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { currentOrganization } = useAuth()

  // meta
  const [stores, setStores] = useState<Store[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([])
  const [storePaymentMethods, setStorePaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingSale, setLoadingSale] = useState(isEdit)

  // header
  const [storeId, setStoreId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [saleDate, setSaleDate] = useState(() => {
    const now = new Date()
    now.setSeconds(0, 0)
    return now.toISOString().slice(0, 16)
  })
  const [note, setNote] = useState('')
  const [orderType, setOrderType] = useState('')
  const [discountPct, setDiscountPct] = useState('0')
  const [extraFees, setExtraFees] = useState('0')
  const [status, setStatus] = useState<'draft' | 'confirmed' | 'cancelled'>('draft')

  // items (edit mode)
  const [items, setItems] = useState<SaleItem[]>([])
  const [itemEdits, setItemEdits] = useState<Record<number, { quantity: string; unit_price: string }>>({})

  // pending items (create mode)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [pendingEdits, setPendingEdits] = useState<Record<number, { quantity: string; unit_price: string }>>({})
  const tempIdRef = useRef(0)

  // add-item form
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [addPrice, setAddPrice] = useState('')

  // search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBy, setSearchBy] = useState<'name' | 'category'>('name')

  // current sale (pour le PDF post-confirmation)
  const [currentSale, setCurrentSale] = useState<Sale | null>(null)

  // UI
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stockErrors, setStockErrors] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isConfirmed = status === 'confirmed'
  const isDraft     = status === 'draft'

  // ── Load meta ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchStores(1), fetchProducts(1), fetchItemCategories(1), fetchCustomers(1)])
      .then(([strs, prods, cats, custs]) => {
        setStores(strs.data)
        setAllProducts(prods.data)
        setCategories(cats.data)
        setCustomers(custs.data)
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false))
  }, [])

  // ── Load sale (edit mode) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    fetchSale(id!)
      .then(s => {
        setStoreId(String(s.store_id))
        setCustomerId(s.customer_id ? String(s.customer_id) : '')
        setCashRegisterId(s.cash_register_id ? String(s.cash_register_id) : '')
        setPaymentMethodId(s.payment_method_id ? String(s.payment_method_id) : '')
        setSaleDate(s.sale_date ? s.sale_date.slice(0, 16).replace(' ', 'T') : '')
        setNote(s.note ?? '')
        setOrderType(s.order_type ?? '')
        setDiscountPct(String(s.discount_percentage))
        setExtraFees(String(s.extra_fees))
        setStatus(s.status)
        setCurrentSale(s)
        const its = s.items ?? []
        setItems(its)
        const edits: Record<number, { quantity: string; unit_price: string }> = {}
        its.forEach(i => { edits[i.id] = { quantity: String(i.quantity), unit_price: String(i.unit_price) } })
        setItemEdits(edits)
      })
      .catch(() => setError('Impossible de charger la vente.'))
      .finally(() => setLoadingSale(false))
  }, [id, isEdit])

  // ── Charger caisses + moyens de paiement quand le magasin change ──────────
  useEffect(() => {
    if (!storeId) {
      setCashRegisters([])
      setStorePaymentMethods([])
      return
    }
    Promise.all([
      fetchCashRegisters(1, undefined, storeId),
      fetchStorePaymentMethods(storeId),
    ]).then(([regs, methods]) => {
      setCashRegisters(regs.data)
      setStorePaymentMethods(methods)
    }).catch(console.error)
  }, [storeId])

  // ── Pré-remplir le prix de vente quand on sélectionne un produit ──────────
  useEffect(() => {
    if (!selectedProductId) { setAddPrice(''); return }
    const p = allProducts.find(x => String(x.id) === selectedProductId)
    if (p) setAddPrice(p.selling_price != null ? String(p.selling_price) : '0')
  }, [selectedProductId, allProducts])

  // ── Produits filtrés ───────────────────────────────────────────────────────
  const filteredProducts = allProducts.filter(p => {
    if (filterCategoryId && String(p.item_category_id) !== filterCategoryId) return false
    return true
  })

  // ── Items affichés ─────────────────────────────────────────────────────────
  const displayItems: SaleItem[] = isEdit
    ? items.map(i => ({
        ...i,
        quantity:   parseFloat(itemEdits[i.id]?.quantity   ?? String(i.quantity)),
        unit_price: parseFloat(itemEdits[i.id]?.unit_price ?? String(i.unit_price)),
        total:      parseFloat(itemEdits[i.id]?.quantity   ?? String(i.quantity)) *
                    parseFloat(itemEdits[i.id]?.unit_price ?? String(i.unit_price)),
      }))
    : pendingItems.map(pi => ({
        id: pi.tempId,
        sale_id: 0,
        product_id: pi.productId,
        product_name: pi.productName,
        product_sku: pi.productSku,
        product_category: pi.productCategory,
        current_stock: 0,
        quantity:   parseFloat(pendingEdits[pi.tempId]?.quantity   ?? String(pi.quantity)),
        unit_price: parseFloat(pendingEdits[pi.tempId]?.unit_price ?? String(pi.unitPrice)),
        total:      parseFloat(pendingEdits[pi.tempId]?.quantity   ?? String(pi.quantity)) *
                    parseFloat(pendingEdits[pi.tempId]?.unit_price ?? String(pi.unitPrice)),
      }))

  const filteredDisplayItems = displayItems.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return searchBy === 'name'
      ? i.product_name.toLowerCase().includes(q)
      : (i.product_category ?? '').toLowerCase().includes(q)
  })

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const subtotal = displayItems.reduce((s, i) => s + i.total, 0)
  const discount = subtotal * (parseFloat(discountPct) || 0) / 100
  const total    = subtotal - discount + (parseFloat(extraFees) || 0)

  // ── Ajouter un article ─────────────────────────────────────────────────────
  const handleAddItem = useCallback(async () => {
    if (!selectedProductId || !addQty || parseFloat(addQty) <= 0) return
    const product = allProducts.find(p => String(p.id) === selectedProductId)
    if (!product) return

    const qty   = parseFloat(addQty) || 1
    const price = parseFloat(addPrice) || 0

    // Réinitialiser immédiatement pour éviter les doubles soumissions
    setSelectedProductId('')
    setAddQty('1')
    setAddPrice('')

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
        setPendingItems(prev => [...prev, {
          tempId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category?.name ?? null,
          quantity: qty,
          unitPrice: price,
        }])
        setPendingEdits(prev => ({ ...prev, [tempId]: { quantity: String(qty), unit_price: String(price) } }))
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
          const item = await addSaleItem(id!, { product_id: product.id, quantity: qty, unit_price: price })
          setItems(prev => [...prev, item])
          setItemEdits(prev => ({ ...prev, [item.id]: { quantity: String(item.quantity), unit_price: String(item.unit_price) } }))
        } catch (err) { setError(getApiErrorMessage(err)) }
      }
    }
  }, [selectedProductId, addQty, addPrice, allProducts, isEdit, id, items, pendingItems, itemEdits, pendingEdits])

  // ── Supprimer un article ───────────────────────────────────────────────────
  const handleRemoveItem = useCallback(async (itemId: number) => {
    if (!isEdit) {
      setPendingItems(prev => prev.filter(i => i.tempId !== itemId))
      setPendingEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
      return
    }
    try {
      await removeSaleItem(id!, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setItemEdits(prev => { const n = { ...prev }; delete n[itemId]; return n })
    } catch (err) { setError(getApiErrorMessage(err)) }
  }, [isEdit, id])

  // ── Enregistrer ───────────────────────────────────────────────────────────
  async function handleSave() {
    if (!storeId) { setError('Veuillez sélectionner un magasin.'); return }
    if (!isEdit && pendingItems.length === 0) { setError('Ajoutez au moins un article avant d\'enregistrer.'); return }

    setSaving(true)
    setError(null)
    setStockErrors([])
    setSuccessMsg(null)

    try {
      if (!isEdit) {
        const sale = await createSale({
          store_id:             Number(storeId),
          customer_id:          customerId ? Number(customerId) : null,
          cash_register_id:     cashRegisterId ? Number(cashRegisterId) : null,
          payment_method_id:    paymentMethodId ? Number(paymentMethodId) : null,
          sale_date:            saleDate || null,
          note:                 note.trim() || null,
          order_type:           orderType || null,
          discount_percentage:  parseFloat(discountPct) || 0,
          extra_fees:           parseFloat(extraFees) || 0,
          items: pendingItems.map(pi => ({
            product_id: pi.productId,
            quantity:   parseFloat(pendingEdits[pi.tempId]?.quantity   ?? String(pi.quantity))   || pi.quantity,
            unit_price: parseFloat(pendingEdits[pi.tempId]?.unit_price ?? String(pi.unitPrice)) || pi.unitPrice,
          })),
        })
        navigate(`/sales/${sale.id}/edit`, { replace: true })
      } else {
        await updateSale(id!, {
          store_id:            Number(storeId),
          customer_id:         customerId ? Number(customerId) : null,
          cash_register_id:    cashRegisterId ? Number(cashRegisterId) : null,
          payment_method_id:   paymentMethodId ? Number(paymentMethodId) : null,
          sale_date:           saleDate || null,
          note:                note.trim() || null,
          order_type:          orderType || null,
          discount_percentage: parseFloat(discountPct) || 0,
          extra_fees:          parseFloat(extraFees) || 0,
        })
        const refreshed = await fetchSale(id!)
        setCurrentSale(refreshed)
        setItems(refreshed.items ?? [])
        setItemEdits(prev => {
          const edits: Record<number, { quantity: string; unit_price: string }> = {}
          ;(refreshed.items ?? []).forEach(i => {
            edits[i.id] = prev[i.id] ?? { quantity: String(i.quantity), unit_price: String(i.unit_price) }
          })
          return edits
        })
        setSuccessMsg('Vente enregistrée.')
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; errors?: string[] } } }
      const data = apiErr?.response?.data
      if (data?.errors?.length) {
        setStockErrors(data.errors)
        setError(data.message ?? 'Stock insuffisant.')
      } else {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePdf() {
    const sale = currentSale
    if (!sale) return
    setPrinting(true)
    try {
      const blob = await pdf(<SalePdf sale={sale} organization={currentOrganization} />).toBlob()
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      setPrinting(false)
    }
  }

  if (loadingMeta || loadingSale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  const statusMeta  = STATUS_META[status]
  const selectedStore = stores.find(s => String(s.id) === storeId)

  return (
    <div className=" space-y-6">

      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/sales')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">
                {isEdit ? `Vente #${id!.padStart(4, '0')}` : 'Nouvelle vente'}
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isConfirmed ? (
              <>
                <button type="button" onClick={() => navigate('/sales')}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Liste des ventes
                </button>
                <button type="button" onClick={() => navigate('/sales/create')}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Plus className="h-4 w-4" />
                  Nouvelle vente
                </button>
                <button
                  type="button"
                  onClick={() => void handlePdf()}
                  disabled={printing || !currentSale}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Facture
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => navigate('/sales')}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer la vente
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className=" space-y-5 px-6 py-6">

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {stockErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Articles avec stock insuffisant :
            </p>
            <ul className="ml-4 list-disc space-y-1">
              {stockErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMsg}</div>
        )}

        {/* ══════════════════ EN-TÊTE ══════════════════════════════════════════ */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex justify-center pt-8 pb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF6FF]">
              <ShoppingBag className="h-10 w-10 text-[#0F2E4A]" />
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Magasin + Client */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Magasin <span className="text-red-500">*</span>
                </label>
                <Sel value={storeId} onChange={e => setStoreId(e.target.value)} disabled={isConfirmed}>
                  <option value="">— Choisir un magasin —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Client</label>
                <Sel value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={isConfirmed}>
                  <option value="">— Anonyme —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
              </div>
            </div>

            {/* Caisse + Moyen de paiement */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Caisse</label>
                <Sel
                  value={cashRegisterId}
                  onChange={e => setCashRegisterId(e.target.value)}
                  disabled={isConfirmed || !storeId}
                >
                  <option value="">— Sans caisse —</option>
                  {cashRegisters.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Sel>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Moyen de paiement</label>
                <Sel
                  value={paymentMethodId}
                  onChange={e => setPaymentMethodId(e.target.value)}
                  disabled={isConfirmed || !storeId}
                >
                  <option value="">— Non renseigné —</option>
                  {storePaymentMethods.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Sel>
              </div>
            </div>

            {/* Date + Note */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Date et heure de la vente</label>
                <Inp type="datetime-local" value={saleDate} onChange={e => setSaleDate(e.target.value)} disabled={isConfirmed} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Note</label>
                <Inp
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  disabled={isConfirmed}
                  placeholder="Remarques, conditions…"
                />
              </div>
            </div>

            {/* Type de commande */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type de commande <span className="text-xs font-normal text-gray-400">(facultatif)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '',          label: 'Non précisé' },
                  { value: 'sur_place', label: 'Sur place'   },
                  { value: 'emporter',  label: 'À emporter'  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isConfirmed}
                    onClick={() => setOrderType(opt.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                      orderType === opt.value
                        ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info magasin */}
            {selectedStore && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
                <Receipt className="h-4 w-4 shrink-0" />
                Vente depuis : <span className="font-semibold">{selectedStore.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════ AJOUT D'ARTICLE ══════════════════════════════════ */}
        {isDraft && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-3">
              <p className="text-sm font-semibold text-gray-700">Ajout d'un article</p>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-end gap-3">
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
                <div className="w-28">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>
                  <Inp type="number" step="0.001" min="0.001" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="1" />
                </div>

                {/* Prix unitaire */}
                <div className="w-36">
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Prix unit. (CFA)</label>
                  <Inp type="number" step="0.01" min="0" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="0.00" />
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
          <div className="border-b border-gray-100 px-6 py-3">
            <p className="text-sm font-semibold text-gray-700">Articles de la vente</p>
          </div>

          {/* Barre de recherche */}
          <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 px-6 py-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article…"
              className="w-52 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">Par</span>
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock dispo.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Stock après</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    Stock magasin <span className="block normal-case font-normal text-gray-400">(au moment de la vente)</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    Stock global <span className="block normal-case font-normal text-gray-400">(au moment de la vente)</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Prix unit.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  {isDraft && <th className="w-10 px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDisplayItems.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 10 : 9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ShoppingBag className="h-10 w-10" />
                        <span className="text-sm">Aucun article dans cette vente</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDisplayItems.map(item => {
                    const isEditItem = isEdit
                    const edits = isEditItem ? itemEdits[item.id] : pendingEdits[item.id]
                    const currentQty   = edits?.quantity   ?? String(item.quantity)
                    const currentPrice = edits?.unit_price ?? String(item.unit_price)
                    const tracksStock  = item.track_inventory ?? true
                    const stockAfter   = tracksStock ? (item.current_stock ?? 0) - (parseFloat(currentQty) || 0) : null
                    const isInsufficient = isEdit && tracksStock && (item.current_stock ?? 0) < item.quantity

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

                        {/* Stock disponible */}
                        <td className="px-4 py-3 text-right">
                          {isEdit && tracksStock && item.current_stock != null
                            ? <span className={`font-medium ${isInsufficient ? 'text-red-600' : 'text-gray-700'}`}>
                                {item.current_stock.toLocaleString('fr-FR')}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Quantité — éditable si draft */}
                        <td className="px-4 py-3 text-right">
                          {isConfirmed ? (
                            <span className="font-semibold text-gray-800">{item.quantity.toLocaleString('fr-FR')}</span>
                          ) : (
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={currentQty}
                              onChange={e => {
                                if (isEditItem) {
                                  setItemEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: e.target.value } }))
                                } else {
                                  setPendingEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: e.target.value } }))
                                }
                              }}
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                            />
                          )}
                        </td>

                        {/* Stock après vente */}
                        <td className="px-4 py-3 text-right">
                          {isEdit && tracksStock && stockAfter != null ? (
                            <span className={`font-medium ${stockAfter < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {stockAfter.toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Stock magasin au moment de la vente */}
                        <td className="px-4 py-3 text-right">
                          {isConfirmed && tracksStock && item.stock_store_at_sale != null ? (
                            <span className="font-medium text-gray-700">
                              {(item.stock_store_at_sale as number).toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Stock global au moment de la vente */}
                        <td className="px-4 py-3 text-right">
                          {isConfirmed && tracksStock && item.stock_global_at_sale != null ? (
                            <span className="font-medium text-gray-700">
                              {(item.stock_global_at_sale as number).toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Prix unitaire — éditable si draft */}
                        <td className="px-4 py-3 text-right">
                          {isConfirmed ? (
                            <span>{item.unit_price.toLocaleString('fr-FR')} CFA</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={currentPrice}
                                onChange={e => {
                                  if (isEditItem) {
                                    setItemEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], unit_price: e.target.value } }))
                                  } else {
                                    setPendingEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], unit_price: e.target.value } }))
                                  }
                                }}
                                className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                              />
                              <span className="text-xs text-gray-400">CFA</span>
                            </div>
                          )}
                        </td>

                        {/* Total ligne */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {((parseFloat(currentQty) || 0) * (parseFloat(currentPrice) || 0)).toLocaleString('fr-FR')} CFA
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

          {/* Footer : remise + frais + totaux */}
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Remise et frais */}
              <div className="flex flex-wrap gap-4">
                <div className="w-52">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Remise globale (%)</label>
                  <Inp
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={discountPct}
                    onChange={e => setDiscountPct(e.target.value)}
                    disabled={isConfirmed}
                    placeholder="0"
                  />
                </div>
                <div className="w-52">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Frais supplémentaires (CFA)</label>
                  <Inp
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraFees}
                    onChange={e => setExtraFees(e.target.value)}
                    disabled={isConfirmed}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Récap totaux */}
              <div className="min-w-[240px] space-y-1.5 text-sm">
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
                  <span>Total à encaisser</span>
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
