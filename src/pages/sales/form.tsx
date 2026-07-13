import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'

import {

  AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, FileText, Loader2,

  LockOpen, Plus, Receipt, RefreshCw, Save, ShoppingBag, Store as StoreIcon, Trash2

} from 'lucide-react'

import { pdf } from '@react-pdf/renderer'

import {

  fetchSale, createSale, updateSale, confirmSale,

  addSaleItem, updateSaleItem, removeSaleItem,

} from '../../api/sales'

import { fetchStores } from '../../api/stores'

import { fetchCashRegisters } from '../../api/cashRegisters'

import { fetchProducts } from '../../api/products'

import { fetchItemCategories } from '../../api/itemCategories'

import { fetchCustomers, createCustomer } from '../../api/customer'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import Modal from '../../components/Modal'

import { fetchStorePaymentMethods } from '../../api/paymentMethods'

import { fetchRestaurantOptions } from '../../api/restaurantOptions'

import { openCashRegisterSession } from '../../api/cashRegisterSessions'

import { getApiErrorMessage } from '../../lib/apiError'

import { fetchGeneralSetting } from '../../api/generalSettings'

import { useAuth } from '../../contexts/useAuth'

import Swal from 'sweetalert2'

import QRCode from 'qrcode'

import SalePdf from './SalePdf'

import type { CashRegister, Customer, ItemCategory, PaymentMethod, Product, RestaurantOption, Sale, SaleItem, Store } from '../../types/api'
import type { GeneralSetting } from '../../types/generalSetting'



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

  const [generalSetting, setGeneralSetting] = useState<GeneralSetting | null>(null)

  const [restaurantOptions, setRestaurantOptions] = useState<RestaurantOption[]>([])

  const [loadingMeta, setLoadingMeta] = useState(true)

  const [loadingSale, setLoadingSale] = useState(isEdit)



  // selection steps state

  const [step, setStep] = useState<'loading' | 'select_store' | 'select_register' | 'open_session' | 'sale_form'>('loading')

  const [loadingRegisters, setLoadingRegisters] = useState(false)



  // session open states

  const [openingBalance, setOpeningBalance] = useState('0')

  const [openingNote, setOpeningNote] = useState('')

  const [openingSubmitting, setOpeningSubmitting] = useState(false)

  const [openingError, setOpeningError] = useState<string | null>(null)



  // header

  const [storeId, setStoreId] = useState('')

  const [customerId, setCustomerId] = useState('')

  const [cashRegisterId, setCashRegisterId] = useState('')

  const [paymentMethodId, setPaymentMethodId] = useState('')

  const [saleDate, setSaleDate] = useState('')

  const [note, setNote] = useState('')

  const [orderType, setOrderType] = useState('')

  const [discountPct, setDiscountPct] = useState('0')

  const [extraFees, setExtraFees] = useState('0')

  const [status, setStatus] = useState<'draft' | 'confirmed' | 'cancelled'>('draft')



  // items (edit mode)

  const [items, setItems] = useState<SaleItem[]>([])

  const [itemEdits, setItemEdits] = useState<Record<number, { quantity: string; unit_price: string; description?: string }>>({})



  // pending items (create mode)

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])

  const [pendingEdits, setPendingEdits] = useState<Record<number, { quantity: string; unit_price: string; description?: string }>>({})

  const tempIdRef = useRef(0)



  // add-item form

  const [filterCategoryId, setFilterCategoryId] = useState('')

  const [selectedProductId, setSelectedProductId] = useState('')

  const [productSearchQuery, setProductSearchQuery] = useState('')

  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerIfu, setNewCustomerIfu] = useState('')
  const [newCustomerDiscount, setNewCustomerDiscount] = useState<number | ''>('')
  const [newCustomerNote, setNewCustomerNote] = useState('')
  const [newCustomerAib, setNewCustomerAib] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)

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



  // ── Numéro de facture (généré côté front) ──────────────────────────────────

  const selectedCashRegister = useMemo(

    () => cashRegisters.find(r => String(r.id) === cashRegisterId) ?? null,

    [cashRegisters, cashRegisterId]

  )



  const nextInvoiceNumber = useMemo(() => {

    if (!selectedCashRegister) return null

    const nextSeq = (selectedCashRegister.open_session?.invoice_count ?? 0) + 1

    const seq     = String(nextSeq).padStart(6, '0')

    return `FAC-${selectedCashRegister.id}W-${seq}`

  }, [selectedCashRegister])



  // ── Load meta & Handle Session Persistence ──────────────────────────────────

  useEffect(() => {

    Promise.all([fetchStores(1), fetchProducts(1), fetchItemCategories(1), fetchCustomers(1), fetchGeneralSetting()])

      .then(async ([strs, prods, cats, custs, setting]) => {

        setStores(strs.data)

        setAllProducts(prods.data)

        setCategories(cats.data)

        setCustomers(custs.data)

        setGeneralSetting(setting)



        if (isEdit) {

          setStep('sale_form')

          setLoadingMeta(false)

          return

        }



        const storedStoreId = localStorage.getItem('lynx_sales_store_id')

        const storedRegisterId = localStorage.getItem('lynx_sales_cash_register_id')



        if (storedStoreId && storedRegisterId) {

          if (storedRegisterId === 'none') {

            setStoreId(storedStoreId)

            setCashRegisterId('')

            setStep('sale_form')

            return

          }

          try {

            setLoadingRegisters(true)

            const regs = await fetchCashRegisters(1, undefined, storedStoreId)

            setCashRegisters(regs.data)

            

            const activeReg = regs.data.find(r => String(r.id) === storedRegisterId)

            if (activeReg) {

              setStoreId(storedStoreId)

              setCashRegisterId(storedRegisterId)



              if (activeReg.open_session) {

                setStep('sale_form')

              } else {

                setStep('open_session')

                // (pas de pré-remplissage du solde)

              }

            } else {

              localStorage.removeItem('lynx_sales_store_id')

              localStorage.removeItem('lynx_sales_cash_register_id')

              setStep('select_store')

            }

          } catch (err) {

            console.error('Persistence validation failed', err)

            setStep('select_store')

          } finally {

            setLoadingRegisters(false)

          }

        } else {

          setStep('select_store')

        }

      })

      .catch(console.error)

      .finally(() => setLoadingMeta(false))

  }, [isEdit])



  // ── Fermer les dropdowns quand on clique en dehors ─────────────────────────────

  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {

      const target = event.target as HTMLElement

      const productDropdown = target.closest('[data-product-dropdown]')

      const customerDropdown = target.closest('[data-customer-dropdown]')



      if (!productDropdown && showProductDropdown) {

        setShowProductDropdown(false)

      }

      if (!customerDropdown && showCustomerDropdown) {

        setShowCustomerDropdown(false)

      }

    }



    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)

  }, [showProductDropdown, showCustomerDropdown])



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

      setRestaurantOptions([])

      return

    }

    Promise.all([

      fetchCashRegisters(1, undefined, storeId),

      fetchStorePaymentMethods(storeId),

      fetchRestaurantOptions(1),

    ]).then(([regs, methods, opts]) => {

      setCashRegisters(regs.data)

      setStorePaymentMethods(methods)

      setRestaurantOptions(opts.data)

      // Définir "Espèces" comme moyen de paiement par défaut
      const cashMethod = methods.find(m => m.name === 'Espèces')
      if (cashMethod && !paymentMethodId) {
        setPaymentMethodId(String(cashMethod.id))
      }

    }).catch(console.error)

  }, [storeId])



  // ── Handlers pour les étapes de sélection de caisse ─────────────────────────

  const handleSelectStore = (id: number) => {

    setStoreId(String(id))

    setStep('select_register')

  }



  const handleSelectRegister = async (register: CashRegister) => {

    setCashRegisterId(String(register.id))

    if (register.open_session) {

      localStorage.setItem('lynx_sales_store_id', storeId)

      localStorage.setItem('lynx_sales_cash_register_id', String(register.id))

      setStep('sale_form')

    } else {

      setStep('open_session')

      setOpeningBalance('0')

    }

  }



  const handleOpenSession = async () => {

    const val = parseFloat(openingBalance)

    if (isNaN(val) || val < 0) {

      setOpeningError('Solde d\'ouverture invalide.')

      return

    }

    setOpeningSubmitting(true)

    setOpeningError(null)

    try {

      await openCashRegisterSession(Number(cashRegisterId), {

        opening_balance: val,

        note: openingNote.trim() || null,

      })

      localStorage.setItem('lynx_sales_store_id', storeId)

      localStorage.setItem('lynx_sales_cash_register_id', cashRegisterId)

      

      // Refresh register list to get active session preloaded

      if (storeId) {

        const regs = await fetchCashRegisters(1, undefined, storeId)

        setCashRegisters(regs.data)

      }

      setStep('sale_form')

    } catch (e) {

      setOpeningError(getApiErrorMessage(e))

    } finally {

      setOpeningSubmitting(false)

    }

  }



  const handleChangeRegister = async () => {

    if (isEdit && isConfirmed) return

    const result = await Swal.fire({

      title: 'Changer de caisse ?',

      text: 'La sélection du magasin et de la caisse sera réinitialisée.',

      icon: 'warning',

      showCancelButton: true,

      confirmButtonColor: '#0F2E4A',

      cancelButtonColor: '#6B7280',

      confirmButtonText: 'Oui, changer',

      cancelButtonText: 'Annuler',

    })

    if (!result.isConfirmed) return



    localStorage.removeItem('lynx_sales_store_id')

    localStorage.removeItem('lynx_sales_cash_register_id')

    setStoreId('')

    setCashRegisterId('')

    setStep('select_store')

  }



  const handleNewSale = () => {

    setCustomerId('')

    // Réinitialiser à Espèces par défaut
    const cashMethod = storePaymentMethods.find(m => m.name === 'Espèces')
    setPaymentMethodId(cashMethod ? String(cashMethod.id) : '')

    setSaleDate('')

    setNote('')

    setOrderType('')

    setDiscountPct('0')

    setExtraFees('0')

    setStatus('draft')

    setItems([])

    setItemEdits({})

    setPendingItems([])

    setPendingEdits({})

    setCurrentSale(null)

    setError(null)

    setStockErrors([])

    setSuccessMsg(null)

    setSearchQuery('')

    setFilterCategoryId('')

    setSelectedProductId('')

    setProductSearchQuery('')

    setShowProductDropdown(false)

    setCustomerSearchQuery('')

    setShowCustomerDropdown(false)

    setAddQty('1')

    setAddPrice('')

    navigate('/sales/create')

  }



  // ── Pré-remplir le prix de vente quand on sélectionne un produit ──────────

  useEffect(() => {

    if (!selectedProductId) { setAddPrice(''); return }

    const p = allProducts.find(x => String(x.id) === selectedProductId)

    if (p) setAddPrice(p.selling_price != null ? String(p.selling_price) : '0')

  }, [selectedProductId, allProducts])



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



  // ── Clients filtrés ───────────────────────────────────────────────────────

  const filteredCustomers = customers.filter(c => {
    if (customerSearchQuery) {
      const q = customerSearchQuery.toLowerCase()
      const matchesName = c.name.toLowerCase().includes(q)
      if (!matchesName) return false
    }
    return true
  })



  // ── Items affichés ─────────────────────────────────────────────────────────

  const displayItems: SaleItem[] = isEdit

    ? items.map(i => ({

        ...i,

        description: itemEdits[i.id]?.description ?? i.description ?? null,

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

        description: pendingEdits[pi.tempId]?.description ?? null,

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

  // ── Paiement par solde client ("Compte client") ───────────────────────────
  const customerAccountPaymentsEnabled = generalSetting?.customer_account_payments ?? false

  const availablePaymentMethods = storePaymentMethods.filter(
    m => !m.category?.deducts_customer_balance || customerAccountPaymentsEnabled
  )

  const selectedPaymentMethod = storePaymentMethods.find(m => String(m.id) === paymentMethodId)

  const requiresCustomerBalance = selectedPaymentMethod?.category?.deducts_customer_balance ?? false

  const selectedCustomerBalance = customerId
    ? customers.find(c => String(c.id) === customerId)?.account_balance ?? 0
    : 0



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



  // ── Créer un nouveau client ───────────────────────────────────────────────

  const handleCreateCustomer = async () => {

    if (!newCustomerName.trim()) {

      setCustomerError('Le nom du client est requis.')

      return

    }

    if (newCustomerIfu.trim()) {

      const ifuDigits = newCustomerIfu.trim().replace(/\D/g, '')
      if (ifuDigits.length !== 13) {
        setCustomerError('L\'IFU doit contenir exactement 13 chiffres.')
        return
      }
    }



    setCreatingCustomer(true)

    setCustomerError(null)



    try {

      const newCustomer = await createCustomer({

        name: newCustomerName.trim(),

        phone: telephoneForApi(newCustomerPhone),

        email: newCustomerEmail.trim() || null,

        tax_id: newCustomerIfu.trim() || null,

        discount_percentage: newCustomerDiscount !== '' ? Number(newCustomerDiscount) : null,

        note: newCustomerNote.trim() || null,

        aib: newCustomerAib,

      })



      // Add the new customer to the list

      setCustomers(prev => [...prev, newCustomer])



      // Select the new customer

      setCustomerId(String(newCustomer.id))



      // Close modal and reset form

      setShowCustomerModal(false)

      setNewCustomerName('')

      setNewCustomerPhone('')

      setNewCustomerEmail('')

      setNewCustomerIfu('')

      setNewCustomerDiscount('')

      setNewCustomerNote('')

      setNewCustomerAib(false)

    } catch (err) {

      setCustomerError(getApiErrorMessage(err))

    } finally {

      setCreatingCustomer(false)

    }

  }



  // ── Enregistrer ───────────────────────────────────────────────────────────

  async function handleSave() {

    if (!storeId) { setError('Veuillez sélectionner un magasin.'); return }

    if (!isEdit && pendingItems.length === 0) { setError('Ajoutez au moins un article avant d\'enregistrer.'); return }

    if (requiresCustomerBalance && !customerId) { setError('Veuillez sélectionner un client pour un paiement par compte client.'); return }



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

          sale_date:            (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          })(),

          note:                 note.trim() || null,

          order_type:           orderType || null,

          invoice_number:       nextInvoiceNumber,

          discount_percentage:  parseFloat(discountPct) || 0,

          extra_fees:           parseFloat(extraFees) || 0,

          items: pendingItems.map(pi => ({

            product_id: pi.productId,

            quantity:   parseFloat(pendingEdits[pi.tempId]?.quantity   ?? String(pi.quantity))   || pi.quantity,

            unit_price: parseFloat(pendingEdits[pi.tempId]?.unit_price ?? String(pi.unitPrice)) || pi.unitPrice,

            description: pendingEdits[pi.tempId]?.description?.trim() || null,

          })),

        })

        navigate(`/sales/${sale.id}/edit`, { replace: true })

      } else {

        await updateSale(id!, {

          store_id:            Number(storeId),

          customer_id:         customerId ? Number(customerId) : null,

          cash_register_id:    cashRegisterId ? Number(cashRegisterId) : null,

          payment_method_id:   paymentMethodId ? Number(paymentMethodId) : null,

          sale_date:           saleDate ? saleDate.slice(0, 16).replace('T', ' ') : null,

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



  // ── Réessayer la normalisation DGI (vente restée en brouillon suite à un échec) ──

  async function handleRetryDgi() {

    if (!id) return

    setSaving(true)

    setError(null)

    void Swal.fire({

      title: 'Normalisation DGI en cours…',

      text: 'Merci de patienter, la vente est envoyée à la DGI.',

      allowOutsideClick: false,

      allowEscapeKey: false,

      showConfirmButton: false,

      didOpen: () => Swal.showLoading(),

    })

    try {

      const updated = await confirmSale(id)

      setCurrentSale(updated)

      setStatus(updated.status)

      await Swal.fire({

        title: 'Normalisation DGI réussie',

        text: `La vente ${updated.invoice_number ?? ''} a été normalisée et confirmée.`,

        icon: 'success',

        confirmButtonColor: '#0F2E4A',

      })

    } catch (err) {

      try {

        const refreshed = await fetchSale(id)

        setCurrentSale(refreshed)

      } catch { /* on garde l'état courant si le rechargement échoue */ }

      await Swal.fire({

        title: 'Échec de la normalisation DGI',

        text: getApiErrorMessage(err),

        icon: 'error',

        confirmButtonColor: '#0F2E4A',

      })

    } finally {

      setSaving(false)

    }

  }



  async function handlePdf() {

    const sale = currentSale

    if (!sale) return

    setPrinting(true)

    try {

      const dgiQrDataUrl = sale.code_dgi ? await QRCode.toDataURL(sale.code_dgi, { margin: 1, width: 200 }) : null

      const blob = await pdf(<SalePdf sale={sale} organization={currentOrganization} dgiQrDataUrl={dgiQrDataUrl} />).toBlob()

      const url  = URL.createObjectURL(blob)

      window.open(url, '_blank')

      setTimeout(() => URL.revokeObjectURL(url), 60_000)

    } finally {

      setPrinting(false)

    }

  }



  if (loadingMeta || loadingSale || step === 'loading') {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">

        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />

      </div>

    )

  }



  if (step === 'select_store') {

    return (

      <div className="min-h-screen bg-[#F8FAFC] px-6 py-12 lg:px-10">

        <div className="mx-auto max-w-5xl space-y-8">

          <div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuration de la caisse</h1>

            <p className="mt-1 text-sm font-medium text-gray-500">Étape 1 sur 3</p>

          </div>



          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">

            <h2 className="text-xl font-bold text-gray-900">Sélectionnez un magasin</h2>

            <p className="mt-1 text-sm text-gray-500">Choisissez le magasin où vous souhaitez effectuer la vente.</p>



            <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

              {stores.map(store => (

                <button

                  key={store.id}

                  type="button"

                  onClick={() => handleSelectStore(store.id)}

                  className="flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:border-[#3B82F6] hover:bg-blue-50/10 hover:shadow-md transition-all cursor-pointer text-left group"

                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">

                      <StoreIcon className="h-6 w-6" />

                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors">

                        {store.name}

                      </p>

                      {store.address && (

                        <p className="mt-1 text-xs text-gray-500 line-clamp-1">{store.address}</p>

                      )}

                    </div>

                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />

                </button>

              ))}

            </div>

          </div>

        </div>

      </div>

    )

  }



  if (step === 'select_register') {

    const selectedStore = stores.find(s => String(s.id) === storeId)

    return (

      <div className="min-h-screen bg-[#F8FAFC] px-6 py-12 lg:px-10">

        <div className="mx-auto max-w-5xl space-y-8">

          <div className="flex items-center gap-3">

            <button

              type="button"

              onClick={() => setStep('select_store')}

              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm transition"

            >

              <ArrowLeft className="h-5 w-5" />

            </button>

            <div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuration de la caisse</h1>

              <p className="mt-1 text-sm font-medium text-gray-500">Étape 2 sur 3</p>

            </div>

          </div>



          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">

            <h2 className="text-xl font-bold text-gray-900">Sélectionnez une caisse</h2>

            <p className="mt-1 text-sm text-gray-500">

              Magasin : <span className="font-semibold text-gray-800">{selectedStore?.name ?? '—'}</span>

            </p>



            {loadingRegisters ? (

              <div className="flex items-center justify-center py-12">

                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />

              </div>

            ) : cashRegisters.length === 0 ? (

              <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

                <button

                  type="button"

                  onClick={() => {

                    setCashRegisterId('')

                    localStorage.setItem('lynx_sales_store_id', storeId)

                    localStorage.setItem('lynx_sales_cash_register_id', 'none')

                    setStep('sale_form')

                  }}

                  className="flex items-center justify-between p-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50/30 hover:border-[#3B82F6] hover:bg-blue-50/10 hover:shadow-md cursor-pointer group transition-all text-left"

                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-[#3B82F6] transition-colors">

                      <ShoppingBag className="h-6 w-6" />

                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors">

                        Continuer sans caisse

                      </p>

                      <p className="mt-1 text-xs text-gray-500">

                        Vente directe sans session de caisse

                      </p>

                    </div>

                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />

                </button>

              </div>

            ) : (

              <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

                {cashRegisters.map(register => {

                  const isActive = register.status === 'active'

                  const hasSession = !!register.open_session

                  return (

                    <button

                      key={register.id}

                      type="button"

                      disabled={!isActive}

                      onClick={() => void handleSelectRegister(register)}

                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left group

                        ${!isActive

                          ? 'border-gray-150 bg-gray-50 opacity-60 cursor-not-allowed'

                          : 'border-gray-200 bg-white hover:border-[#3B82F6] hover:bg-blue-50/10 hover:shadow-md cursor-pointer'}`}

                    >

                      <div className="flex items-center gap-4">

                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors

                          ${hasSession

                            ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'

                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>

                          <div className={`h-3 w-3 rounded-full ${hasSession ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />

                        </div>

                        <div>

                          <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors">

                            {register.name}

                          </p>

                          <p className={`mt-1 text-xs font-medium ${hasSession ? 'text-emerald-600' : 'text-gray-500'}`}>

                            {hasSession ? 'Active' : 'Fermée'}

                          </p>

                        </div>

                      </div>

                      <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />

                    </button>

                  )

                })}

                {/* Special card to continue without register */}

                <button

                  type="button"

                  onClick={() => {

                    setCashRegisterId('')

                    localStorage.setItem('lynx_sales_store_id', storeId)

                    localStorage.setItem('lynx_sales_cash_register_id', 'none')

                    setStep('sale_form')

                  }}

                  className="flex items-center justify-between p-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50/30 hover:border-[#3B82F6] hover:bg-blue-50/10 hover:shadow-md cursor-pointer group transition-all text-left"

                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-[#3B82F6] transition-colors">

                      <ShoppingBag className="h-6 w-6" />

                    </div>

                    <div>

                      <p className="font-semibold text-gray-900 text-sm md:text-base leading-tight group-hover:text-blue-600 transition-colors">

                        Continuer sans caisse

                      </p>

                      <p className="mt-1 text-xs text-gray-500">

                        Vente directe sans session de caisse

                      </p>

                    </div>

                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />

                </button>

              </div>

            )}

          </div>

        </div>

      </div>

    )

  }



  if (step === 'open_session') {

    const selectedStore = stores.find(s => String(s.id) === storeId)

    const selectedRegister = cashRegisters.find(r => String(r.id) === cashRegisterId)



    return (

      <div className="min-h-screen bg-[#F8FAFC] px-6 py-12 lg:px-10">

        <div className="mx-auto max-w-xl space-y-8">

          <div className="flex items-center gap-3">

            <button

              type="button"

              onClick={() => setStep('select_register')}

              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm transition"

            >

              <ArrowLeft className="h-5 w-5" />

            </button>

            <div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuration de la caisse</h1>

              <p className="mt-1 text-sm font-medium text-gray-500">Étape 3 sur 3</p>

            </div>

          </div>



          <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm space-y-6">

            <div>

              <h2 className="text-xl font-bold text-gray-900 font-sans">Ouvrir la session de caisse</h2>

              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">

                Magasin : <span className="font-semibold text-gray-800">{selectedStore?.name ?? '—'}</span>

                <br />

                Caisse : <span className="font-semibold text-gray-800">{selectedRegister?.name ?? '—'}</span>

              </p>

            </div>



            {openingError && (

              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">

                {openingError}

              </div>

            )}



            <div className="space-y-4">

              <div>

                <label className="mb-1.5 block text-sm font-semibold text-gray-700">

                  Solde d'ouverture (CFA) <span className="text-red-500">*</span>

                </label>

                <p className="mb-2 text-xs text-gray-500">

                  Comptez le montant physiquement présent dans la caisse avant d'ouvrir la session.

                </p>

                <input

                  type="number"

                  min="0"

                  step="1"

                  value={openingBalance}

                  autoFocus

                  onChange={e => setOpeningBalance(e.target.value)}

                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"

                />



              </div>



              <div>

                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Note (optionnelle)</label>

                <textarea

                  value={openingNote}

                  onChange={e => setOpeningNote(e.target.value)}

                  rows={3}

                  placeholder="Observations, remarques…"

                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"

                />

              </div>

            </div>



            <button

              type="button"

              disabled={openingSubmitting}

              onClick={() => void handleOpenSession()}

              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 active:scale-95 transition disabled:opacity-65"

            >

              {openingSubmitting ? (

                <Loader2 className="h-5 w-5 animate-spin" />

              ) : (

                <LockOpen className="h-5 w-5" />

              )}

              Ouvrir la caisse et commencer à vendre

            </button>

          </div>

        </div>

      </div>

    )

  }



  // ── Modal de création de client ─────────────────────────────────────────────
  if (showCustomerModal) {
    return (
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        preventClose={creatingCustomer}
        title="Nouveau client"
        subtitle="Créez une fiche client."
        maxWidthClassName="max-w-2xl"
      >
        {customerError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {customerError}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void handleCreateCustomer(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customer-form-name" className="mb-1 block text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                id="customer-form-name"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Ex. Jean Dupont"
              />
            </div>

            <div>
              <label htmlFor="customer-form-email" className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="customer-form-email"
                type="email"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="exemple@mail.com"
              />
            </div>

            <div>
              <label htmlFor="customer-form-phone" className="mb-1 block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <PhoneInput
                id="customer-form-phone"
                value={newCustomerPhone}
                onChange={setNewCustomerPhone}
                placeholder="01 97 …"
                className="rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="customer-form-tax-id" className="mb-1 block text-sm font-medium text-gray-700">
                IFU
              </label>
              <input
                id="customer-form-tax-id"
                maxLength={13}
                value={newCustomerIfu}
                onChange={(e) => setNewCustomerIfu(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="IFU…"
              />
            </div>

            <div>
              <label htmlFor="sale-customer-form-discount" className="mb-1 block text-sm font-medium text-gray-700">
                Réduction (%)
              </label>
              <input
                id="sale-customer-form-discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newCustomerDiscount}
                onChange={(e) => setNewCustomerDiscount(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Ex. 10"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="customer-form-note" className="mb-1 block text-sm font-medium text-gray-700">
                Note
              </label>
              <textarea
                id="customer-form-note"
                rows={3}
                value={newCustomerNote}
                onChange={(e) => setNewCustomerNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Remarques…"
              />
            </div>

            <div className="flex items-center sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newCustomerAib}
                  onChange={(e) => setNewCustomerAib(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                AIB
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={creatingCustomer}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {creatingCustomer ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 'Créer le client'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!creatingCustomer) setShowCustomerModal(false)
              }}
              disabled={creatingCustomer}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </Modal>
    )
  }

  const statusMeta  = STATUS_META[status]

  const selectedStore = stores.find(s => String(s.id) === storeId)

  const selectedRegisterName = selectedCashRegister?.name || (cashRegisterId ? `Caisse #${cashRegisterId}` : '—')

  const selectedStoreName = selectedStore?.name || (storeId ? `Magasin #${storeId}` : '—')

  const hasActiveSession = !!(selectedCashRegister?.open_session)



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

                <button type="button" onClick={handleNewSale}

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

        {currentSale?.status === 'draft' && currentSale?.dgi_status === 'failed' && (

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">

            <p className="flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 shrink-0" />

              <span>

                <span className="font-semibold">Normalisation DGI échouée</span> — la vente reste en brouillon (stock non décrémenté).

                {currentSale.dgi_error && <> Détail : {currentSale.dgi_error}</>}

              </span>

            </p>

            <button

              type="button"

              onClick={() => void handleRetryDgi()}

              disabled={saving}

              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"

            >

              <RefreshCw className="h-3.5 w-3.5" />

              Réessayer la normalisation

            </button>

          </div>

        )}



        {/* Bandeau magasin + caisse en lecture seule */}

        {storeId && (

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">

            <div className="flex flex-wrap items-center gap-6 text-sm">

              <div className="flex items-center gap-2">

                <span className="font-semibold text-gray-500 uppercase tracking-wider text-xs">Magasin :</span>

                <span className="font-bold text-gray-900">{selectedStoreName}</span>

              </div>

              <div className="h-4 w-px bg-gray-300 hidden sm:block" />

              <div className="flex items-center gap-2">

                <span className="font-semibold text-gray-500 uppercase tracking-wider text-xs">Caisse :</span>

                <span className="font-bold text-gray-900">{selectedRegisterName}</span>

              </div>

              {hasActiveSession && (

                <>

                  <div className="h-4 w-px bg-gray-300 hidden sm:block" />

                  <div className="flex items-center gap-1.5 text-emerald-700">

                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />

                    <span className="font-semibold text-xs">Session active</span>

                  </div>

                </>

              )}

            </div>

            {!isConfirmed && (

              <button

                type="button"

                onClick={() => void handleChangeRegister()}

                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition active:scale-95"

              >

                Changer

              </button>

            )}

          </div>

        )}



        {/* ══════════════════ EN-TÊTE ══════════════════════════════════════════ */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="flex justify-center pt-8 pb-4">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EFF6FF]">

              <ShoppingBag className="h-10 w-10 text-[#0F2E4A]" />

            </div>

          </div>



          <div className="px-6 pb-6 space-y-4">

            {/* Client + Moyen de paiement sur la même ligne */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="relative" data-customer-dropdown>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">Client</label>

                <input

                  type="text"

                  value={customerId ? (customers.find(c => String(c.id) === customerId)?.name || '') : ''}

                  readOnly

                  onClick={() => !isConfirmed && setShowCustomerDropdown(!showCustomerDropdown)}

                  placeholder="Anonyme..."

                  disabled={isConfirmed}

                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 cursor-pointer bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"

                />

                {showCustomerDropdown && !isConfirmed && (

                  <div className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">

                    <div className="sticky top-0 bg-white border-b border-gray-100 p-2">

                      <input

                        type="text"

                        value={customerSearchQuery}

                        onChange={e => setCustomerSearchQuery(e.target.value)}

                        placeholder="Rechercher un client..."

                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"

                        autoFocus

                      />

                    </div>

                    <button

                      type="button"

                      onClick={() => {

                        setCustomerId('')

                        setCustomerSearchQuery('')

                        setShowCustomerDropdown(false)

                      }}

                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-gray-500 italic"

                    >

                      — Anonyme —

                    </button>

                    {filteredCustomers.map(c => (

                      <button

                        key={c.id}

                        type="button"

                        onClick={() => {

                          setCustomerId(String(c.id))

                          setCustomerSearchQuery('')

                          setShowCustomerDropdown(false)

                        }}

                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"

                      >

                        <div className="font-medium text-gray-900">{c.name}</div>

                      </button>

                    ))}

                    <button

                      type="button"

                      onClick={() => {

                        setShowCustomerDropdown(false)

                        setShowCustomerModal(true)

                        setCustomerError(null)

                        setNewCustomerName('')

                        setNewCustomerPhone('')

                        setNewCustomerEmail('')

                        setNewCustomerIfu('')

                        setNewCustomerNote('')

                        setNewCustomerAib(false)

                      }}

                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-blue-600 font-semibold border-t border-gray-100 mt-1"

                    >

                      <div className="flex items-center gap-2">

                        <Plus className="h-4 w-4" />

                        Nouveau client

                      </div>

                    </button>

                  </div>

                )}

              </div>

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700">Moyen de paiement</label>

                <Sel

                  value={paymentMethodId}

                  onChange={e => setPaymentMethodId(e.target.value)}

                  disabled={isConfirmed || !storeId}

                >

                  {availablePaymentMethods.map(m => (

                    <option key={m.id} value={m.id}>{m.name}</option>

                  ))}

                </Sel>

                {requiresCustomerBalance && (

                  <p className={`mt-1.5 text-xs ${selectedCustomerBalance < total ? 'text-red-500' : 'text-gray-500'}`}>

                    {customerId

                      ? `Solde du client : ${selectedCustomerBalance.toLocaleString('fr-FR')} CFA${selectedCustomerBalance < total ? ' (insuffisant)' : ''}`

                      : 'Sélectionnez un client pour ce moyen de paiement.'}

                  </p>

                )}

              </div>

            </div>



            {/* Numéro de facture prévu */}

            {nextInvoiceNumber && isDraft && (

              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm">

                <FileText className="h-4 w-4 shrink-0 text-blue-500" />

                <span className="text-blue-700">N° de facture prévu :</span>

                <span className="font-mono font-semibold text-blue-900">{nextInvoiceNumber}</span>

              </div>

            )}

            {currentSale?.invoice_number && isConfirmed && (

              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm">

                <FileText className="h-4 w-4 shrink-0 text-gray-500" />

                <span className="text-gray-600">N° de facture :</span>

                <span className="font-mono font-semibold text-gray-900">{currentSale.invoice_number}</span>

              </div>

            )}







            {/* Date + Note */}

            <div className="grid gap-4 sm:grid-cols-2">

              {isEdit && (

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Date et heure de la vente</label>

                  <Inp type="datetime-local" value={saleDate} onChange={e => setSaleDate(e.target.value)} disabled={isConfirmed} />

                </div>

              )}

              <div className={isEdit ? '' : 'sm:col-span-2'}>

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

                <button

                  type="button"

                  disabled={isConfirmed}

                  onClick={() => setOrderType('')}

                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${

                    orderType === ''

                      ? 'border-[#3B82F6] bg-[#3B82F6] text-white'

                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'

                  }`}

                >

                  Non précisé

                </button>

                {restaurantOptions.map(opt => (

                  <button

                    key={opt.id}

                    type="button"

                    disabled={isConfirmed}

                    onClick={() => setOrderType(String(opt.id))}

                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${

                      orderType === String(opt.id)

                        ? 'border-[#3B82F6] bg-[#3B82F6] text-white'

                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'

                    }`}

                  >

                    {opt.name}

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

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-100 px-6 py-3">

              <p className="text-sm font-semibold text-gray-700">Ajout d'un article</p>

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

                <div className="w-28">

                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Quantité</label>

                  <Inp type="number" min="0" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="1" />

                </div>



                {/* Prix unitaire */}

                <div className="w-36">

                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Prix unit. (CFA)</label>

                  <Inp type="number" min="0" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="0.00" />

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

                            <div className="min-w-[160px]">

                              <p className="font-medium text-gray-900">{item.product_name}</p>

                              {item.product_sku && <p className="text-xs text-gray-400">{item.product_sku}</p>}

                              {isConfirmed ? (

                                item.description && <p className="mt-0.5 text-xs italic text-gray-500">{item.description}</p>

                              ) : (

                                <input
                                  type="text"
                                  value={edits?.description ?? item.description ?? ''}
                                  placeholder="Description (optionnel)…"
                                  onChange={e => {
                                    const value = e.target.value
                                    if (isEditItem) {
                                      setItemEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: value } }))
                                    } else {
                                      setPendingEdits(prev => ({ ...prev, [item.id]: { ...prev[item.id], description: value } }))
                                    }
                                  }}
                                  onBlur={e => {
                                    if (!isEditItem) return
                                    const value = e.target.value.trim() || null
                                    const original = items.find(i => i.id === item.id)?.description ?? null
                                    if (value === original) return
                                    updateSaleItem(id!, item.id, { description: value })
                                      .then(updated => setItems(prev => prev.map(i => (i.id === item.id ? { ...i, description: updated.description ?? value } : i))))
                                      .catch(err => setError(getApiErrorMessage(err)))
                                  }}
                                  className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 placeholder:text-gray-300 focus:border-[#3B82F6] focus:outline-none"
                                />

                              )}

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

