import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, Loader2,
  Package, Plus, Save, Trash2, Upload, X,
} from 'lucide-react'
import {
  fetchProductById, createProduct, updateProduct,
  fetchProductStock,
  fetchProductStorePrices,
  fetchProductStoreSettings, bulkSaveProductStores,
  fetchProductComponents, addProductComponent, removeProductComponent,
  fetchProductSupplements, addProductSupplement, removeProductSupplement,
  fetchProducts, uploadProductImage,
  fetchProductOptions, syncProductOptions,
} from '../../api/products'
import { fetchOptions, createOption } from '../../api/options'
import { fetchItemCategories } from '../../api/itemCategories'
import { fetchVatRates } from '../../api/vatRates'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type {
  ItemCategory, VatRate, Product, Store,
  ProductStockEntry, ProductStorePrice, ProductComponent, ProductSupplement, Option,
} from '../../types/api'

// ─── tiny UI primitives ───────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 ${props.className ?? ''}`} />
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`w-full appearance-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 ${props.className ?? ''}`} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#0F2E4A]' : 'bg-gray-200'} ${disabled ? 'opacity-50' : ''}`}
      >
        <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {title && <div className="border-b border-gray-100 px-6 py-3"><p className="text-sm font-semibold text-gray-700">{title}</p></div>}
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── sold_by radio ─────────────────────────────────────────────────────────

const SOLD_BY_OPTIONS: { value: 'unit' | 'weight' | 'surface'; label: string }[] = [
  { value: 'unit', label: 'Unité' },
  { value: 'weight', label: 'Poids' },
  { value: 'surface', label: 'Surface' },
]

// ─── Tab names ─────────────────────────────────────────────────────────────

type Tab = 'article' | 'stores' | 'components' | 'options' | 'supplements'

// ─── Composant / Supplément en attente (mode création) ───────────────────

interface PendingComponent {
  tempId: number
  childProductId: number
  childName: string
  childSku: string | null
  quantity: number
  unitPrice: number
  total: number
  unitPurchasePrice: number
  purchaseTotal: number
}

interface PendingSupplement {
  tempId: number
  supplementProductId: number
  supplementName: string
  supplementSku: string | null
  price: number
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ItemFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [tab, setTab] = useState<Tab>('article')

  // meta
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [vatRates, setVatRates] = useState<VatRate[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingProduct, setLoadingProduct] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // article fields
  const [name, setName] = useState('')
  const [type, setType] = useState<'simple' | 'composite'>('simple')
  const [categoryId, setCategoryId] = useState('')
  const [soldBy, setSoldBy] = useState<'unit' | 'weight' | 'surface'>('unit')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [purchaseVatId, setPurchaseVatId] = useState('')
  const [salesVatId, setSalesVatId] = useState('')
  const [taxInclusive, setTaxInclusive] = useState(true)
  const [specificTax, setSpecificTax] = useState(false)
  const [trackInventory, setTrackInventory] = useState(false)
  const [allowNegativeStock, setAllowNegativeStock] = useState(true)

  // color
  const [color, setColor] = useState<string>('')

  // images / upload
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageDragging, setImageDragging] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // stores — unified state (stock + prix + dispo + alerte)
  const [stockEntries, setStockEntries] = useState<ProductStockEntry[]>([])
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({})
  const [stockAlertEdits, setStockAlertEdits] = useState<Record<number, string>>({})
  const [storePrices, setStorePrices] = useState<ProductStorePrice[]>([])
  const [priceEdits, setPriceEdits] = useState<Record<number, string>>({})
  const [storeAvailability, setStoreAvailability] = useState<Record<number, boolean>>({})
  const [storeForSale, setStoreForSale] = useState<Record<number, boolean>>({})
  const [storesLoading, setStoresLoading] = useState(false)
  const [storesSaving, setStoresSaving] = useState(false)
  const [storesSaveSuccess, setStoresSaveSuccess] = useState(false)
  const [storesLoaded, setStoresLoaded] = useState(false)

  // refs pour les checkboxes globales (état indéterminé)
  const allAvailabilityRef = useRef<HTMLInputElement>(null)
  const allForSaleRef = useRef<HTMLInputElement>(null)

  // components (composite)
  const [components, setComponents] = useState<ProductComponent[]>([])
  const [compLoading, setCompLoading] = useState(false)
  const [newChildId, setNewChildId] = useState('')
  const [newChildQty, setNewChildQty] = useState('1')
  const [compSaving, setCompSaving] = useState(false)

  // composants en attente (mode création uniquement)
  const [pendingComponents, setPendingComponents] = useState<PendingComponent[]>([])
  const tempIdRef = useRef(0)

  // suppléments
  const [hasSupplements, setHasSupplements] = useState(false)
  const [supplements, setSupplements] = useState<ProductSupplement[]>([])
  const [suppLoading, setSuppLoading] = useState(false)
  const [newSuppId, setNewSuppId] = useState('')
  const [newSuppPrice, setNewSuppPrice] = useState('0')
  const [suppSaving, setSuppSaving] = useState(false)
  const [pendingSupplements, setPendingSupplements] = useState<PendingSupplement[]>([])
  const suppTempIdRef = useRef(0)

  // options
  const [allOptions, setAllOptions] = useState<Option[]>([])
  const [linkedOptionIds, setLinkedOptionIds] = useState<number[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [optionsSaving, setOptionsSaving] = useState(false)
  const [optionSearch, setOptionSearch] = useState('')
  const [showNewOptionForm, setShowNewOptionForm] = useState(false)
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionStatus, setNewOptionStatus] = useState<'active' | 'inactive'>('active')
  const [newOptionSubmitting, setNewOptionSubmitting] = useState(false)

  const currentId = isEdit ? id! : null

  // ── Load meta ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchItemCategories(1),
      fetchVatRates(1),
      fetchProducts(1),
      fetchStores(1),
    ])
      .then(([cats, vats, prods, strs]) => {
        setCategories(cats.data)
        setVatRates(vats.data)
        setAllProducts(prods.data)
        setStores(strs.data)
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false))
  }, [])

  // ── Load product (edit mode) ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return
    fetchProductById(id!)
      .then(async (p) => {
        setName(p.name)
        setType(p.type)
        setCategoryId(String(p.item_category_id))
        setSoldBy(p.sold_by)
        setPurchasePrice(p.purchase_price != null ? String(p.purchase_price) : '')
        setSellingPrice(String(p.selling_price))
        setSku(p.sku ?? '')
        setBarcode(p.barcode ?? '')
        setPurchaseVatId(p.purchase_vat_rate_id != null ? String(p.purchase_vat_rate_id) : '')
        setSalesVatId(p.sales_vat_rate_id != null ? String(p.sales_vat_rate_id) : '')
        setTaxInclusive(p.tax_inclusive)
        setSpecificTax(p.specific_tax)
        setTrackInventory(p.track_inventory)
        setAllowNegativeStock(p.allow_negative_stock)
        setHasSupplements(p.has_supplements)
        if (p.color) setColor(p.color)
        if (p.image_url) {
          const { resolveBackendUrl } = await import('../../lib/url')
          setImagePreview(resolveBackendUrl(p.image_url))
        }
      })
      .catch(() => setError('Impossible de charger le produit.'))
      .finally(() => setLoadingProduct(false))
  }, [id, isEdit])

  // ── Reset trackInventory when type becomes composite ────────────────────────
  useEffect(() => {
    if (type === 'composite' && trackInventory) {
      setTrackInventory(false)
    }
  }, [type])

  // ── Load sub-resources when switching tabs ───────────────────────────────────
  useEffect(() => {
    if (!currentId) return
    if (tab === 'stores' && !storesLoaded) {
      setStoresLoading(true)
      Promise.all([
        fetchProductStock(currentId),
        fetchProductStorePrices(currentId),
        fetchProductStoreSettings(currentId),
      ])
        .then(([stockData, pricesData, settingsData]) => {
          setStockEntries(stockData)
          const stockEditsNew: Record<number, string> = {}
          const alertEditsNew: Record<number, string> = {}
          stockData.forEach(e => {
            stockEditsNew[e.store_id] = String(e.quantity)
            alertEditsNew[e.store_id] = e.min_stock_alert != null ? String(e.min_stock_alert) : ''
          })
          setStockEdits(stockEditsNew)
          setStockAlertEdits(alertEditsNew)

          setStorePrices(pricesData)
          const priceEditsNew: Record<number, string> = {}
          pricesData.forEach(e => { priceEditsNew[e.store_id] = String(e.selling_price) })
          setPriceEdits(priceEditsNew)

          const availNew: Record<number, boolean> = {}
          const forSaleNew: Record<number, boolean> = {}
          settingsData.forEach(s => {
            availNew[s.store_id] = s.available
            forSaleNew[s.store_id] = s.for_sale
          })
          setStoreAvailability(availNew)
          setStoreForSale(forSaleNew)

          setStoresLoaded(true)
        })
        .catch(console.error)
        .finally(() => setStoresLoading(false))
    }
    if (tab === 'components') {
      setCompLoading(true)
      fetchProductComponents(currentId)
        .then(setComponents)
        .catch(console.error)
        .finally(() => setCompLoading(false))
    }
    if (tab === 'supplements') {
      setSuppLoading(true)
      fetchProductSupplements(currentId)
        .then(setSupplements)
        .catch(console.error)
        .finally(() => setSuppLoading(false))
    }
    if (tab === 'options' && !optionsLoaded) {
      setOptionsLoading(true)
      Promise.all([
        fetchOptions(1),
        currentId ? fetchProductOptions(currentId) : Promise.resolve<Option[]>([]),
      ])
        .then(([optData, linked]) => {
          setAllOptions(optData.data)
          setLinkedOptionIds(linked.map((o: Option) => o.id))
          setOptionsLoaded(true)
        })
        .catch(console.error)
        .finally(() => setOptionsLoading(false))
    }
  }, [tab, currentId, storesLoaded, optionsLoaded])

  // ── Valeurs dérivées ──────────────────────────────────────────────────────────
  const defaultSellingPrice = parseFloat(sellingPrice) || 0

  const storeRows = stores.map(s => {
    const stockEntry = stockEntries.find(e => e.store_id === s.id)
    const priceEntry = storePrices.find(e => e.store_id === s.id)
    const editedPrice = priceEdits[s.id]
    const displayPrice = editedPrice !== undefined
      ? (parseFloat(editedPrice) || 0)
      : (priceEntry != null ? priceEntry.selling_price : defaultSellingPrice)
    const isCustom = isEdit
      ? (priceEntry?.is_custom ?? false)
      : editedPrice !== undefined && Math.abs((parseFloat(editedPrice) || 0) - defaultSellingPrice) > 0.001
    return {
      store_id: s.id,
      store_name: s.name,
      quantity: stockEdits[s.id] ?? String(stockEntry?.quantity ?? 0),
      selling_price: displayPrice,
      price_id: priceEntry?.price_id ?? null,
      is_custom: isCustom,
      available: storeAvailability[s.id] ?? true,
      for_sale: storeForSale[s.id] ?? true,
      min_stock_alert: stockAlertEdits[s.id] ?? (stockEntry?.min_stock_alert != null ? String(stockEntry.min_stock_alert) : ''),
    }
  })

  const allAvailable = storeRows.length === 0 || storeRows.every(r => r.available)
  const someAvailable = storeRows.some(r => r.available)
  const allForSale = storeRows.length === 0 || storeRows.every(r => r.for_sale)
  const someForSale = storeRows.some(r => r.for_sale)

  useEffect(() => {
    if (allAvailabilityRef.current) {
      allAvailabilityRef.current.indeterminate = someAvailable && !allAvailable
    }
    if (allForSaleRef.current) {
      allForSaleRef.current.indeterminate = someForSale && !allForSale
    }
  })

  function toggleAllAvailability(checked: boolean) {
    const next: Record<number, boolean> = {}
    stores.forEach(s => { next[s.id] = checked })
    setStoreAvailability(next)
  }

  function toggleAllForSale(checked: boolean) {
    const next: Record<number, boolean> = {}
    stores.forEach(s => { next[s.id] = checked })
    setStoreForSale(next)
  }

  // Composants : état local en création, API en édition
  const activeComponents: ProductComponent[] = isEdit
    ? components
    : pendingComponents.map(pc => ({
        id: pc.tempId,
        child_id: pc.childProductId,
        child_name: pc.childName,
        child_sku: pc.childSku,
        quantity: pc.quantity,
        unit_price: pc.unitPrice,
        total: pc.total,
        unit_purchase_price: pc.unitPurchasePrice,
        purchase_total: pc.purchaseTotal,
      }))

  // ── Save principal ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) {
      setError("Le nom de l'article est requis.")
      setTab('article')
      return
    }
    if (!categoryId) {
      setError('La catégorie est requise.')
      setTab('article')
      return
    }
    if (!sellingPrice) {
      setError('Le prix de vente est requis.')
      setTab('article')
      return
    }

    setSaving(true)
    setError(null)

    const payload: Partial<Product> = {
      name: name.trim(),
      type,
      item_category_id: Number(categoryId),
      sold_by: soldBy,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      selling_price: parseFloat(sellingPrice),
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      purchase_vat_rate_id: purchaseVatId ? Number(purchaseVatId) : null,
      sales_vat_rate_id: salesVatId ? Number(salesVatId) : null,
      tax_inclusive: taxInclusive,
      specific_tax: specificTax,
      track_inventory: trackInventory,
      allow_negative_stock: allowNegativeStock,
      has_supplements: hasSupplements,
      color: color || null,
    }

    try {
      if (isEdit) {
        await updateProduct(id!, payload)
        if (imageFile) await handleUploadNow(id!)
        navigate('/items', { state: { flash: `Article « ${payload.name} » modifié avec succès.` } })
        return
      } else {
        const store_stocks = stores
          .filter(s => {
            const qty = parseFloat(stockEdits[s.id] ?? '0')
            const alert = parseFloat(stockAlertEdits[s.id] ?? '0')
            return qty > 0 || (trackInventory && alert > 0)
          })
          .map(s => ({
            store_id: s.id,
            quantity: parseFloat(stockEdits[s.id] ?? '0'),
            ...(trackInventory && stockAlertEdits[s.id] ? { min_stock_alert: parseFloat(stockAlertEdits[s.id]) || null } : {}),
          }))

        const store_prices = stores
          .filter(s => {
            const edited = priceEdits[s.id]
            return edited !== undefined && Math.abs((parseFloat(edited) || 0) - defaultSellingPrice) > 0.001
          })
          .map(s => ({
            store_id: s.id,
            selling_price: parseFloat(priceEdits[s.id]),
            tax_inclusive: taxInclusive,
          }))

        const store_availability = stores.map(s => ({
          store_id: s.id,
          available: storeAvailability[s.id] ?? true,
          for_sale: storeForSale[s.id] ?? true,
        }))

        const componentsPayload = pendingComponents.map(c => ({
          child_product_id: c.childProductId,
          quantity: c.quantity,
        }))

        const p = await createProduct({
          ...payload,
          ...(store_stocks.length > 0 ? { store_stocks } : {}),
          ...(store_prices.length > 0 ? { store_prices } : {}),
          ...(store_availability.length > 0 ? { store_availability } : {}),
          ...(componentsPayload.length > 0 ? { components: componentsPayload } : {}),
        })

        if (imageFile) await handleUploadNow(p.id)
        if (linkedOptionIds.length > 0) await syncProductOptions(p.id, linkedOptionIds)
        for (const s of pendingSupplements) {
          await addProductSupplement(p.id, s.supplementProductId, s.price)
        }
        navigate('/items', { state: { flash: `Article « ${payload.name} » créé avec succès.` } })
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Save global magasins (mode édition) ─────────────────────────────────────
  async function saveAllStores() {
    if (!currentId) return
    setStoresSaving(true)
    setError(null)
    try {
      const storesPayload = stores.map(s => {
        const priceEntry = storePrices.find(e => e.store_id === s.id)
        const price = parseFloat(priceEdits[s.id] ?? String(priceEntry?.selling_price ?? defaultSellingPrice))
        return {
          store_id: s.id,
          available: storeAvailability[s.id] ?? true,
          for_sale: storeForSale[s.id] ?? true,
          selling_price: isNaN(price) ? defaultSellingPrice : price,
          tax_inclusive: taxInclusive,
          ...(trackInventory ? {
            quantity: parseFloat(stockEdits[s.id] ?? '0') || 0,
            min_stock_alert: stockAlertEdits[s.id] ? (parseFloat(stockAlertEdits[s.id]) || null) : null,
          } : {}),
        }
      })
      await bulkSaveProductStores(currentId, storesPayload)
      setStoresLoaded(false) // recharge les données fraîches depuis l'API
      setStoresSaveSuccess(true)
      setTimeout(() => setStoresSaveSuccess(false), 3000)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setStoresSaving(false)
    }
  }

  // ── Save options (mode édition) ─────────────────────────────────────────────
  async function saveOptions() {
    if (!currentId) return
    setOptionsSaving(true)
    setError(null)
    try {
      await syncProductOptions(currentId, linkedOptionIds)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setOptionsSaving(false)
    }
  }

  // ── Créer une option depuis l'onglet article ────────────────────────────────
  async function handleCreateInlineOption() {
    if (!newOptionName.trim()) return
    setNewOptionSubmitting(true)
    setError(null)
    try {
      const productIds = currentId ? [parseInt(currentId)] : []
      const created = await createOption({
        name: newOptionName.trim(),
        status: newOptionStatus,
        product_ids: productIds,
      })
      setAllOptions(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setLinkedOptionIds(prev => prev.includes(created.id) ? prev : [...prev, created.id])
      setNewOptionName('')
      setNewOptionStatus('active')
      setShowNewOptionForm(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setNewOptionSubmitting(false)
    }
  }

  // ── Component add ──────────────────────────────────────────────────────────
  async function handleAddComponent() {
    if (!newChildId) return

    if (!currentId) {
      const product = allProducts.find(p => String(p.id) === newChildId)
      if (!product) return
      const qty = parseFloat(newChildQty) || 1
      const unitPrice = parseFloat(String(product.selling_price)) || 0
      const unitPurchasePrice = parseFloat(String(product.purchase_price ?? 0)) || 0
      setPendingComponents(prev => [...prev, {
        tempId: ++tempIdRef.current,
        childProductId: product.id,
        childName: product.name,
        childSku: product.sku,
        quantity: qty,
        unitPrice,
        total: unitPrice * qty,
        unitPurchasePrice,
        purchaseTotal: unitPurchasePrice * qty,
      }])
      setNewChildId('')
      setNewChildQty('1')
      return
    }

    setCompSaving(true)
    try {
      const comp = await addProductComponent(currentId, Number(newChildId), parseFloat(newChildQty) || 1)
      setComponents(prev => [...prev, comp])
      setNewChildId('')
      setNewChildQty('1')
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setCompSaving(false) }
  }

  async function handleRemoveComponent(idOrTempId: number) {
    if (!currentId) {
      setPendingComponents(prev => prev.filter(c => c.tempId !== idOrTempId))
      return
    }
    await removeProductComponent(currentId, idOrTempId)
    setComponents(prev => prev.filter(c => c.id !== idOrTempId))
  }

  // ── Supplement add/remove ──────────────────────────────────────────────────
  async function handleAddSupplement() {
    if (!newSuppId) return
    const product = allProducts.find(p => String(p.id) === newSuppId)
    if (!product) return
    const price = parseFloat(newSuppPrice) || 0

    if (!currentId) {
      setPendingSupplements(prev => [...prev, {
        tempId: ++suppTempIdRef.current,
        supplementProductId: product.id,
        supplementName: product.name,
        supplementSku: product.sku,
        price,
      }])
      setNewSuppId('')
      setNewSuppPrice('0')
      return
    }

    setSuppSaving(true)
    try {
      const supp = await addProductSupplement(currentId, product.id, price)
      setSupplements(prev => [...prev, supp])
      setNewSuppId('')
      setNewSuppPrice('0')
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setSuppSaving(false) }
  }

  async function handleRemoveSupplement(idOrTempId: number) {
    if (!currentId) {
      setPendingSupplements(prev => prev.filter(s => s.tempId !== idOrTempId))
      return
    }
    await removeProductSupplement(currentId, idOrTempId)
    setSupplements(prev => prev.filter(s => s.id !== idOrTempId))
  }

  // ── Image helpers ───────────────────────────────────────────────────────────
  function handleImageFile(file: File) {
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    setImageFile(file)
    setColor('') // Clear color when image is set
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    setImageDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleImageFile(file)
  }

  async function handleUploadNow(savedId: string | number) {
    if (!imageFile) return
    setImageUploading(true)
    try {
      const path = await uploadProductImage(savedId, imageFile)
      const { resolveBackendUrl } = await import('../../lib/url')
      setImagePreview(resolveBackendUrl(path))
      setImageFile(null)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setImageUploading(false)
    }
  }

  const totalCompositeSelling = activeComponents.reduce((s, c) => s + c.total, 0)
  const totalCompositePurchase = activeComponents.reduce((s, c) => s + (c.purchase_total ?? 0), 0)
  const unitLabel = soldBy === 'weight' ? 'kg' : soldBy === 'surface' ? 'm²' : 'unité(s)'

  // Refs pour lire les valeurs courantes sans les mettre dans les dépendances de l'effet
  const purchasePriceRef = useRef(purchasePrice)
  const sellingPriceRef = useRef(sellingPrice)
  useEffect(() => { purchasePriceRef.current = purchasePrice }, [purchasePrice])
  useEffect(() => { sellingPriceRef.current = sellingPrice }, [sellingPrice])

  // Auto-remplissage des champs Coûts et Prix si vides, à partir des totaux composants
  useEffect(() => {
    if (type !== 'composite') return
    const comps = isEdit ? components : pendingComponents
    if (comps.length === 0) return

    if (!purchasePriceRef.current) {
      const total = isEdit
        ? components.reduce((s, c) => s + (c.purchase_total ?? 0), 0)
        : pendingComponents.reduce((s, c) => s + c.purchaseTotal, 0)
      if (total > 0) setPurchasePrice(total.toFixed(2))
    }
    if (!sellingPriceRef.current) {
      const total = isEdit
        ? components.reduce((s, c) => s + c.total, 0)
        : pendingComponents.reduce((s, c) => s + c.total, 0)
      if (total > 0) setSellingPrice(total.toFixed(2))
    }
  }, [pendingComponents, components, type, isEdit])

  // ── image section JSX helper ────────────────────────────────────────────────
  function renderImageZone() {
    return (
      <Card title="Image du produit">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
            e.target.value = ''
          }}
        />

        {imagePreview ? (
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="h-40 w-40 rounded-xl border border-gray-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => { setImagePreview(null); setImageFile(null) }}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1">
              {imageFile && (
                <p className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  📎 Fichier sélectionné : <strong>{imageFile.name}</strong><br/>
                  Il sera envoyé lors de l'enregistrement de l'article.
                </p>
              )}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" />
                Changer l'image
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleImageDrop}
            onDragOver={e => { e.preventDefault(); setImageDragging(true) }}
            onDragLeave={() => setImageDragging(false)}
            onClick={() => imageInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center transition-colors ${
              imageDragging
                ? 'border-[#3B82F6] bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-[#3B82F6] hover:bg-blue-50/40'
            }`}
          >
            <Upload className={`mb-3 h-8 w-8 ${imageDragging ? 'text-[#3B82F6]' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-700">Glissez-déposez une image ici</p>
            <p className="mt-1 text-xs text-gray-400">ou cliquez pour parcourir — JPG, PNG, WebP (max 4 Mo)</p>
          </div>
        )}

        {imageUploading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Envoi de l'image…
          </div>
        )}

        <Field label="Couleur de l'article" hint={imagePreview ? "Couleur désactivée car une image est définie" : "Code hexadécimal — utilisé pour l'identification visuelle"}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              disabled={!!imagePreview}
              className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Inp
              value={color}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v)
              }}
              placeholder=""
              disabled={!!imagePreview}
              className="w-36 font-mono uppercase disabled:opacity-50"
              maxLength={7}
            />
            <span
              className="h-8 w-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
              style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : 'transparent' }}
            />
          </div>
        </Field>
      </Card>
    )
  }

  if (loadingMeta || loadingProduct) {
    return <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]"><Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" /></div>
  }

  const childOptions = allProducts.filter(p => String(p.id) !== id && p.type !== 'composite')

  return (
    <div className=" space-y-6">

      {/* ─── sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/items')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">{isEdit ? `Modifier « ${name} »` : 'Nouvel article'}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/items')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            {storesSaveSuccess && (
              <span className="text-xs font-medium text-green-600">Enregistré ✓</span>
            )}
            <button
              type="button"
              onClick={() => void (
                isEdit && tab === 'stores' ? saveAllStores() :
                isEdit && tab === 'options' ? saveOptions() :
                handleSave()
              )}
              disabled={
                (isEdit && tab === 'stores' && storesSaving) ||
                (isEdit && tab === 'options' && optionsSaving) ||
                ((!isEdit || (tab !== 'stores' && tab !== 'options')) && saving)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
            >
              {(isEdit && tab === 'stores' ? storesSaving : isEdit && tab === 'options' ? optionsSaving : saving)
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className=" flex gap-0 px-6">
          {([
            ['article', 'Article'],
            ['stores', 'Magasins'],
            ...(type === 'composite' ? [['components', 'Composants'] as const] : []),
            ['options', 'Options'],
            ...(hasSupplements ? [['supplements', 'Suppléments'] as const] : []),
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-[#0F2E4A] text-[#0F2E4A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className=" px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className=" px-6 py-6 space-y-5">

        {/* ════════════════════════════ ARTICLE TAB ═══════════════════════════ */}
        {tab === 'article' && (
          <form id="article-form" onSubmit={e => { e.preventDefault(); void handleSave() }} className="space-y-5">

            <Card title="Article">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Noms" required>
                    <Inp value={name} onChange={e => setName(e.target.value)} required placeholder="Nom du produit" />
                  </Field>
                  <Field label="Les catégories" required>
                    <Sel value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                      <option value="">Sélectionner</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Sel>
                  </Field>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Vendu par</label>
                  <div className="flex flex-wrap gap-6">
                    {SOLD_BY_OPTIONS.map(o => (
                      <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="sold_by"
                          value={o.value}
                          checked={soldBy === o.value}
                          onChange={() => setSoldBy(o.value)}
                          className="h-4 w-4 accent-[#0F2E4A]"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Coûts"
                    hint={type === 'composite' && activeComponents.length > 0
                      ? `Calculé depuis les composants : ${totalCompositePurchase.toLocaleString('fr-FR')} CFA`
                      : 'Prix d\'achat fournisseur TTC'}
                  >
                    <div className="relative">
                      <Inp type="number" min="0" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" className="pr-12" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">CFA</span>
                    </div>
                  </Field>
                  <Field
                    label="Prix"
                    required
                    hint={type === 'composite' && activeComponents.length > 0
                      ? `Calculé depuis les composants : ${totalCompositeSelling.toLocaleString('fr-FR')} CFA`
                      : taxInclusive ? 'Prix de vente TTC' : 'Prix de vente HT'}
                  >
                    <div className="relative">
                      <Inp type="number" min="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required placeholder="0.00" className="pr-12" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">CFA</span>
                    </div>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="UGS (SKU)" hint="Référence interne">
                    <Inp value={sku} onChange={e => setSku(e.target.value)} placeholder="Ex. CAF-ESP-250" />
                  </Field>
                  <Field label="Code-barres">
                    <Inp value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Ex. 3700123456789" />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="TVA Achat">
                    <Sel value={purchaseVatId} onChange={e => setPurchaseVatId(e.target.value)}>
                      <option value="">Aucune TVA</option>
                      {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
                    </Sel>
                  </Field>
                  <Field label="TVA Vente">
                    <Sel value={salesVatId} onChange={e => setSalesVatId(e.target.value)}>
                      <option value="">Aucune TVA</option>
                      {vatRates.map(v => <option key={v.id} value={v.id}>{v.name} ({v.rate}%)</option>)}
                    </Sel>
                  </Field>
                </div>

                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50 px-4">
                  <Toggle checked={specificTax} onChange={setSpecificTax} label="Taxe spécifique (T.S)" />
                  {/* 
                    <Toggle checked={taxInclusive} onChange={setTaxInclusive} label="Prix affiché TTC (taxes incluses)" />
                  */}
                  <Toggle checked={trackInventory} onChange={setTrackInventory} label="Gérer le stock de cet article" disabled={type === 'composite'} />
                  <Toggle checked={allowNegativeStock} onChange={setAllowNegativeStock} label="Autoriser le stock négatif (vente sans stock)" />
                </div>
              </div>
            </Card>

            <Card title="Type de produit">
              <div className="space-y-3">
                <div className="flex gap-6">
                  {([['simple', 'Simple'], ['composite', 'Composé (assemblage)']] as const).map(([v, l]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                      <input type="radio" name="ptype" value={v} checked={type === v} onChange={() => setType(v)} className="h-4 w-4 accent-[#0F2E4A]" />
                      {l}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    id="has-supplements"
                    checked={hasSupplements}
                    onChange={e => {
                      setHasSupplements(e.target.checked)
                      if (!e.target.checked && tab === 'supplements') setTab('article')
                    }}
                    className="h-4 w-4 cursor-pointer rounded accent-[#0F2E4A]"
                  />
                  <div>
                    <label htmlFor="has-supplements" className="cursor-pointer select-none text-sm font-medium text-gray-700">
                      Ce produit a des suppléments
                    </label>
                    <p className="text-xs text-gray-400">Permet d'associer des articles optionnels avec un prix lors de la vente</p>
                  </div>
                </div>
              </div>
            </Card>

            {renderImageZone()}
          </form>
        )}

        {/* ════════════════════════════ MAGASINS TAB ══════════════════════════ */}
        {tab === 'stores' && (
          <Card title="Magasins">

            {/* Bandeau mode création */}
            {!isEdit && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                Les données saisies ici (stock, prix, disponibilité) seront enregistrées avec l'article en une seule opération.
                {sellingPrice && <span className="ml-1">Prix par défaut : <strong>{parseFloat(sellingPrice).toLocaleString('fr-FR')} CFA</strong></span>}
              </div>
            )}

            {/* Checkboxes globales */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <input
                  ref={allAvailabilityRef}
                  type="checkbox"
                  id="all-available"
                  checked={allAvailable}
                  onChange={e => toggleAllAvailability(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded accent-[#0F2E4A]"
                />
                <div>
                  <label htmlFor="all-available" className="cursor-pointer select-none text-sm font-medium text-gray-700">
                    Disponible dans tous les magasins
                  </label>
                  <p className="text-xs text-gray-400">L'article peut être en stock dans le magasin</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <input
                  ref={allForSaleRef}
                  type="checkbox"
                  id="all-for-sale"
                  checked={allForSale}
                  onChange={e => toggleAllForSale(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded accent-[#0F2E4A]"
                />
                <div>
                  <label htmlFor="all-for-sale" className="cursor-pointer select-none text-sm font-medium text-gray-700">
                    En vente dans tous les magasins
                  </label>
                  <p className="text-xs text-gray-400">L'article apparaît lors d'une vente dans le magasin</p>
                </div>
              </div>
            </div>

            {isEdit && storesLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" /></div>
            ) : storeRows.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Aucun magasin configuré.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Magasin</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Disponible</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Vente</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Prix (CFA)</th>
                      {trackInventory && (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Stock ({unitLabel})
                        </th>
                      )}
                      {trackInventory && (
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Seuil d'alerte
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {storeRows.map(row => (
                      <tr key={row.store_id} className={`transition-colors hover:bg-gray-50 ${!row.available && !row.for_sale ? 'opacity-40' : ''}`}>

                        {/* Nom du magasin */}
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${row.available ? 'bg-green-400' : 'bg-gray-300'}`} />
                            {row.store_name}
                          </div>
                        </td>

                        {/* Disponibilité (en stock) */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.available}
                            onChange={e => setStoreAvailability(prev => ({ ...prev, [row.store_id]: e.target.checked }))}
                            className="h-4 w-4 cursor-pointer rounded accent-[#0F2E4A]"
                          />
                        </td>

                        {/* Vente */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.for_sale}
                            onChange={e => setStoreForSale(prev => ({ ...prev, [row.store_id]: e.target.checked }))}
                            className="h-4 w-4 cursor-pointer rounded accent-[#0F2E4A]"
                          />
                        </td>

                        {/* Prix de vente */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={priceEdits[row.store_id] ?? String(row.selling_price)}
                            onChange={e => setPriceEdits(prev => ({ ...prev, [row.store_id]: e.target.value }))}
                            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 float-right"
                          />
                        </td>

                        {/* Stock (conditionné à trackInventory) */}
                        {trackInventory && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <input
                                type="number"
                                min="0"
                                value={stockEdits[row.store_id] ?? row.quantity}
                                onChange={e => setStockEdits(prev => ({ ...prev, [row.store_id]: e.target.value }))}
                                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                              />
                            </div>
                          </td>
                        )}

                        {/* Seuil d'alerte (conditionné à trackInventory) */}
                        {trackInventory && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <input
                                type="number"
                                min="0"
                                value={stockAlertEdits[row.store_id] ?? row.min_stock_alert}
                                onChange={e => setStockAlertEdits(prev => ({ ...prev, [row.store_id]: e.target.value }))}
                                placeholder="—"
                                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right text-sm placeholder-gray-300 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                              />
                            </div>
                          </td>
                        )}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Note stock désactivé */}
            {!trackInventory && storeRows.length > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Activez "Gérer le stock" dans l'onglet Article pour saisir les quantités et seuils d'alerte.
              </p>
            )}

          </Card>
        )}

        {/* ════════════════════════ COMPOSANTS TAB ════════════════════════════ */}
        {tab === 'components' && (
          <Card title="Inventaire — Article composé">
            {!isEdit && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                Les composants ajoutés ici seront enregistrés avec l'article en une seule opération.
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Choisissez votre produit</label>
                <Sel value={newChildId} onChange={e => setNewChildId(e.target.value)}>
                  <option value="">Sélectionner un composant</option>
                  {childOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.sku ? ` (${p.sku})` : ''}
                    </option>
                  ))}
                </Sel>
              </div>
              <div className="w-28">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>
                <Inp type="number" min="0.001" value={newChildQty} onChange={e => setNewChildQty(e.target.value)} />
              </div>
              <button type="button" onClick={() => void handleAddComponent()} disabled={!newChildId || compSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50">
                {compSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </button>
            </div>

            {isEdit && compLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" /></div>
            ) : activeComponents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-400">Aucun composant ajouté.</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Composant</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Quantités</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Coûts</th>
                        <th className="w-12 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeComponents.map(comp => (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{comp.child_name}</p>
                            {comp.child_sku && <p className="text-xs text-gray-400">{comp.child_sku}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">{comp.quantity}</td>
                          <td className="px-4 py-3 text-right">{comp.total.toLocaleString('fr-FR')} CFA</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => void handleRemoveComponent(comp.id)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-6 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Prix d'achat total</p>
                    <p className="text-sm font-semibold text-gray-700">{totalCompositePurchase.toLocaleString('fr-FR')} CFA</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Prix de vente total</p>
                    <p className="text-sm font-semibold text-[#0F2E4A]">{totalCompositeSelling.toLocaleString('fr-FR')} CFA</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Ces totaux sont reportés automatiquement dans les champs Coûts et Prix de l'onglet Article si ceux-ci sont vides.
                </p>
              </>
            )}
          </Card>
        )}

        {/* ════════════════════════════ OPTIONS TAB ═══════════════════════════ */}
        {tab === 'options' && (
          <Card title="Options liées à cet article">
            {!isEdit && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                Les options sélectionnées seront liées à l'article lors de l'enregistrement.
              </div>
            )}

            {/* Barre recherche + bouton nouvelle option */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={optionSearch}
                onChange={e => setOptionSearch(e.target.value)}
                placeholder="Rechercher une option..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
              <button
                type="button"
                onClick={() => { setShowNewOptionForm(v => !v); setNewOptionName(''); setNewOptionStatus('active') }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nouvelle option
              </button>
            </div>

            {/* Formulaire inline de création */}
            {showNewOptionForm && (
              <div className="mb-4 rounded-xl border border-dashed border-[#3B82F6]/40 bg-blue-50/40 p-4">
                <p className="mb-3 text-xs font-semibold text-gray-600">Créer une nouvelle option</p>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={newOptionName}
                    onChange={e => setNewOptionName(e.target.value)}
                    placeholder="Nom de l'option *"
                    className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleCreateInlineOption() } }}
                  />
                  <select
                    aria-label="Statut"
                    value={newOptionStatus}
                    onChange={e => setNewOptionStatus(e.target.value as 'active' | 'inactive')}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleCreateInlineOption()}
                    disabled={!newOptionName.trim() || newOptionSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
                  >
                    {newOptionSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewOptionForm(false)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {optionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" />
              </div>
            ) : allOptions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Aucune option disponible. Créez-en une avec le bouton ci-dessus.
              </p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-auto pr-1">
                {allOptions
                  .filter(o =>
                    !optionSearch ||
                    o.name.toLowerCase().includes(optionSearch.toLowerCase())
                  )
                  .map(o => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 transition-colors hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={linkedOptionIds.includes(o.id)}
                        onChange={e => {
                          setLinkedOptionIds(prev =>
                            e.target.checked
                              ? [...prev, o.id]
                              : prev.filter(id => id !== o.id)
                          )
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">{o.name}</span>
                        <span className={`ml-2 text-xs ${o.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                          {o.status}
                        </span>
                      </div>
                    </label>
                  ))}
              </div>
            )}
          </Card>
        )}

        {/* ════════════════════════ SUPPLÉMENTS TAB ═══════════════════════════ */}
        {tab === 'supplements' && (
          <Card title="Suppléments de cet article">
            {!isEdit && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
                Les suppléments ajoutés ici seront enregistrés avec l'article en une seule opération.
              </div>
            )}
            <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Article supplément</label>
                <Sel value={newSuppId} onChange={e => {
                  setNewSuppId(e.target.value)
                  const p = allProducts.find(p => String(p.id) === e.target.value)
                  if (p) setNewSuppPrice(String(parseFloat(String(p.selling_price)) || 0))
                  else setNewSuppPrice('0')
                }}>
                  <option value="">Sélectionner un article</option>
                  {allProducts
                    .filter(p => String(p.id) !== id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))}
                </Sel>
              </div>
              <div className="w-40">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Prix unitaire (CFA)</label>
                <div className="relative">
                  <Inp
                    type="number"
                    min="0"
                    value={newSuppPrice}
                    onChange={e => setNewSuppPrice(e.target.value)}
                    placeholder="0"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">CFA</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleAddSupplement()}
                disabled={!newSuppId || suppSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-50"
              >
                {suppSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </button>
            </div>

            {(() => {
              const activeSupplements: ProductSupplement[] = isEdit
                ? supplements
                : pendingSupplements.map(s => ({
                    id: s.tempId,
                    supplement_product_id: s.supplementProductId,
                    supplement_name: s.supplementName,
                    supplement_sku: s.supplementSku,
                    price: s.price,
                  }))

              if (isEdit && suppLoading) {
                return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#3B82F6]" /></div>
              }
              if (activeSupplements.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-400">Aucun supplément ajouté.</p>
                  </div>
                )
              }
              return (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Prix unitaire</th>
                        <th className="w-12 px-4 py-3 sr-only">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeSupplements.map(supp => (
                        <tr key={supp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{supp.supplement_name}</p>
                            {supp.supplement_sku && <p className="text-xs text-gray-400">{supp.supplement_sku}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {supp.price.toLocaleString('fr-FR')} CFA
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              aria-label={`Supprimer ${supp.supplement_name}`}
                              onClick={() => void handleRemoveSupplement(supp.id)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </Card>
        )}

      </div>
    </div>
  )
}
