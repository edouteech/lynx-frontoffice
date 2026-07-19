import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock, Pencil, Plus, Trash2, Search } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import Modal from '../../components/Modal'
import {
  createDiscount,
  deleteDiscount,
  fetchDiscounts,
  updateDiscount,
} from '../../api/discounts'
import { fetchStores } from '../../api/stores'
import { fetchProducts } from '../../api/products'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Discount, Product, Store, ValidityConfig, ValidityFrequency } from '../../types/api'
import Swal from 'sweetalert2'

const DAYS: { label: string; iso: number }[] = [
  { label: 'Lundi', iso: 1 }, { label: 'Mardi', iso: 2 }, { label: 'Mercredi', iso: 3 },
  { label: 'Jeudi', iso: 4 }, { label: 'Vendredi', iso: 5 }, { label: 'Samedi', iso: 6 },
  { label: 'Dimanche', iso: 7 },
]
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const FREQUENCIES: { value: ValidityFrequency; label: string }[] = [
  { value: 'quotidienne', label: 'Quotidienne' },
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'annuelle', label: 'Annuelle' },
]

export default function DiscountsIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Discount[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stores, setStores] = useState<Store[]>([])

  // Existing form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'percentage' | 'amount' | 'variant'>('percentage')
  const [value, setValue] = useState<number | ''>('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Status
  const [isActive, setIsActive] = useState(true)

  // Scope
  const [scope, setScope] = useState<'global' | 'specific'>('global')
  const [productList, setProductList] = useState<Product[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Validity
  const [showValidity, setShowValidity] = useState(false)
  const [validityMode, setValidityMode] = useState<'ponctuelle' | 'recurrente'>('ponctuelle')
  // ponctuelle
  const [ponctuellStartsAt, setPonctuellStartsAt] = useState('')
  const [ponctuellEndsAt, setPonctuellEndsAt] = useState('')
  // recurrente - commun
  const [validityFrequency, setValidityFrequency] = useState<ValidityFrequency>('quotidienne')
  const [recurGlobalStart, setRecurGlobalStart] = useState('')
  const [recurGlobalEnd, setRecurGlobalEnd] = useState('')
  const [recurTimeFrom, setRecurTimeFrom] = useState('')
  const [recurTimeTo, setRecurTimeTo] = useState('')
  // recurrente - fréquence spécifique
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>([])
  const [annualDates, setAnnualDates] = useState<{ month: number; day: number }[]>([])

  useEffect(() => {
    fetchStores(1).then((res) => setStores(res.data)).catch(() => {})
  }, [])

  // Re-fetch products when scope is 'specific' and selected stores change
  useEffect(() => {
    if (scope !== 'specific') return
    if (selectedStoreIds.length === 0) {
      setProductList([])
      setSelectedProductIds([])
      return
    }
    let cancelled = false
    setLoadingProducts(true)
    ;(async () => {
      try {
        let all: Product[] = []
        let page = 1
        let lastPage = 1
        do {
          const res = await fetchProducts({ page, per_page: 100, store_ids: selectedStoreIds })
          all = all.concat(res.data)
          lastPage = res.last_page
          page = res.current_page + 1
        } while (!cancelled && page <= lastPage)
        if (!cancelled) setProductList(all)
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => { cancelled = true }
  }, [scope, selectedStoreIds])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDiscounts(page)
        if (!cancelled) {
          setPaginated({
            data: res.data,
            current_page: res.current_page,
            last_page: res.last_page,
            total: res.total,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError(getApiErrorMessage(e))
          setPaginated(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [page])

  function resetForm() {
    setName('')
    setType('percentage')
    setValue('')
    setSelectedStoreIds([])
    setRequiresPassword(false)
    setEditing(null)
    setIsActive(true)
    setScope('global')
    setSelectedProductIds([])
    setProductSearch('')
    setShowValidity(false)
    setValidityMode('ponctuelle')
    setPonctuellStartsAt('')
    setPonctuellEndsAt('')
    setValidityFrequency('quotidienne')
    setRecurGlobalStart('')
    setRecurGlobalEnd('')
    setRecurTimeFrom('')
    setRecurTimeTo('')
    setDaysOfWeek([])
    setDaysOfMonth([])
    setAnnualDates([])
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  const startEdit = useCallback((d: Discount) => {
    setEditing(d)
    setName(d.name)
    setType(d.type)
    setValue(d.value)
    setSelectedStoreIds(d.stores?.map(s => s.id) || [])
    setRequiresPassword(d.requires_password)
    setIsActive(d.is_active ?? true)
    setScope(d.scope ?? 'global')
    setSelectedProductIds(d.products?.map(p => p.id) || [])
    if (d.validity_slots) {
      setShowValidity(true)
      setValidityMode(d.validity_slots.mode)
      if (d.validity_slots.mode === 'ponctuelle') {
        setPonctuellStartsAt(d.validity_slots.starts_at ?? '')
        setPonctuellEndsAt(d.validity_slots.ends_at ?? '')
      } else {
        setValidityFrequency(d.validity_slots.frequency ?? 'quotidienne')
        setRecurGlobalStart(d.validity_slots.starts_at ?? '')
        setRecurGlobalEnd(d.validity_slots.ends_at ?? '')
        setRecurTimeFrom(d.validity_slots.time_from ?? '')
        setRecurTimeTo(d.validity_slots.time_to ?? '')
        setDaysOfWeek(d.validity_slots.days_of_week ?? [])
        setDaysOfMonth(d.validity_slots.days_of_month ?? [])
        setAnnualDates(d.validity_slots.annual_dates ?? [])
      }
    } else {
      setShowValidity(false)
      setValidityMode('ponctuelle')
      setPonctuellStartsAt('')
      setPonctuellEndsAt('')
    }
    setShowModal(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedStoreIds.length === 0) return
    if (type !== 'variant' && value === '') return
    if (scope === 'specific' && selectedProductIds.length === 0) return

    setSaving(true)
    setError(null)

    let validityPayload: ValidityConfig | null = null
    if (showValidity) {
      if (validityMode === 'ponctuelle') {
        validityPayload = {
          mode: 'ponctuelle',
          starts_at: ponctuellStartsAt || null,
          ends_at: ponctuellEndsAt || null,
        }
      } else {
        validityPayload = {
          mode: 'recurrente',
          frequency: validityFrequency,
          starts_at: recurGlobalStart || null,
          ends_at: recurGlobalEnd || null,
          time_from: recurTimeFrom || null,
          time_to: recurTimeTo || null,
          ...(validityFrequency === 'hebdomadaire' ? { days_of_week: daysOfWeek } : {}),
          ...(validityFrequency === 'mensuelle'    ? { days_of_month: daysOfMonth } : {}),
          ...(validityFrequency === 'annuelle'     ? { annual_dates: annualDates } : {}),
        }
      }
    }

    const payload = {
      store_ids: selectedStoreIds,
      name: name.trim(),
      type,
      value: type === 'variant' ? 0 : Number(value),
      requires_password: requiresPassword,
      is_active: isActive,
      scope,
      ...(scope === 'specific' ? { product_ids: selectedProductIds } : {}),
      validity_slots: validityPayload,
    }

    Swal.fire({
      title: editing ? 'Modification...' : 'Création...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      if (editing) {
        await updateDiscount(editing.id, payload)
      } else {
        await createDiscount(payload)
      }
      const actionText = editing ? 'modifiée' : 'créée'
      setShowModal(false)
      resetForm()
      const res = await fetchDiscounts(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
      Swal.fire({
        title: editing ? 'Modifiée !' : 'Créée !',
        text: `La réduction "${payload.name}" a été ${actionText} avec succès.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
      Swal.fire({
        title: 'Erreur',
        text: getApiErrorMessage(err),
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(
    async (d: Discount) => {
      const result = await Swal.fire({
        title: 'Supprimer la réduction ?',
        text: `Voulez-vous vraiment supprimer la réduction "${d.name}" ? Cette action est irréversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        reverseButtons: true,
      })

      if (!result.isConfirmed) return

      setError(null)

      Swal.fire({
        title: 'Suppression...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      try {
        await deleteDiscount(d.id)
        if (editing?.id === d.id) resetForm()
        const res = await fetchDiscounts(page)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
        Swal.fire({
          title: 'Supprimée !',
          text: `La réduction "${d.name}" a été supprimée avec succès.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
        Swal.fire({
          title: 'Erreur',
          text: "Impossible de supprimer cette réduction.",
          icon: 'error',
          confirmButtonColor: '#3B82F6',
        })
      }
    },
    [page, editing?.id]
  )

  const handleToggleStatus = useCallback(async (d: Discount, next: boolean) => {
    if (togglingId !== null) return
    setError(null)
    setTogglingId(d.id)
    try {
      await updateDiscount(d.id, { is_active: next })
      setPaginated((prev) =>
        prev
          ? { ...prev, data: prev.data.map((x) => (x.id === d.id ? { ...x, is_active: next } : x)) }
          : prev
      )
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }, [togglingId])

  function toggleDayOfWeek(iso: number) {
    setDaysOfWeek(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso])
  }

  function toggleDayOfMonth(day: number) {
    setDaysOfMonth(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function switchValidityMode(m: 'ponctuelle' | 'recurrente') {
    setValidityMode(m)
  }

  const categoryOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string; productIds: number[] }>()
    for (const p of productList) {
      const catId = p.item_category_id
      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: p.category?.name ?? 'Sans catégorie', productIds: [] })
      }
      map.get(catId)!.productIds.push(p.id)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [productList])

  function toggleCategorySelection(productIds: number[]) {
    setSelectedProductIds((prev) => {
      const allSelected = productIds.every((id) => prev.includes(id))
      if (allSelected) {
        return prev.filter((id) => !productIds.includes(id))
      }
      return Array.from(new Set([...prev, ...productIds]))
    })
  }

  const columns: Column<Discount>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'store_id',
        label: 'Magasins',
        render: (_, item) => {
          const count = item.stores?.length || 0
          if (count === 0) return <span className="text-gray-400">Aucun</span>
          if (count === stores.length && stores.length > 0) return <span className="font-medium text-[#3B82F6]">Tous les magasins</span>
          return `${count} magasin${count > 1 ? 's' : ''}`
        },
      },
      {
        key: 'scope',
        label: 'Portée',
        render: (v) => v === 'specific' ? 'Spécifique' : 'Globale',
      },
      {
        key: 'type',
        label: 'Type',
        render: (v) => {
          switch (v) {
            case 'percentage': return 'Pourcentage (%)'
            case 'amount': return 'Montant fixe'
            case 'variant': return 'Variable'
            default: return String(v)
          }
        },
      },
      {
        key: 'value',
        label: 'Valeur',
        render: (v, item) => item.type === 'variant' ? '—' : String(v),
      },
      {
        key: 'requires_password',
        label: 'Mot de passe',
        render: (v) => v ? 'Oui' : 'Non',
      },
      {
        key: 'is_active',
        label: 'Statut',
        render: (_v, item) => (
          <ToggleSwitch
            checked={item.is_active ?? true}
            disabled={togglingId === item.id}
            onChange={(next) => void handleToggleStatus(item, next)}
            label="Activer/désactiver cette réduction"
          />
        ),
      },
    ],
    [stores, togglingId, handleToggleStatus]
  )

  const actions: Action<Discount>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: startEdit,
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (d) => void handleDelete(d),
      },
    ],
    [startEdit, handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Réductions</h1>
          <p className="mt-1 text-gray-600">
            Gestion des réductions applicables par magasin
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Ajouter une réduction
        </button>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier la réduction' : 'Nouvelle réduction'}
        subtitle="Définissez les paramètres de la réduction et les magasins concernés."
        preventClose={saving}
        maxWidthClassName="max-w-2xl"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 py-1">

          {/* ── Informations de base ── */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Réduction étudiant"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  aria-label="Type de calcul de la réduction"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                >
                  <option value="percentage">Pourcentage</option>
                  <option value="amount">Montant</option>
                  <option value="variant">Variant (libre)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Valeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                  required={type !== 'variant'}
                  disabled={type === 'variant'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 disabled:bg-gray-100"
                  placeholder={type === 'percentage' ? '10' : '1000'}
                />
              </div>
            </div>

            <div className="my-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              >
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={requiresPassword}
                onChange={(e) => setRequiresPassword(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Mot de passe requis pour appliquer la réduction
            </label>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Portée et magasins ── */}
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Type de réduction</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'global', label: 'Globale', desc: '' },
                  { value: 'specific', label: 'Spécifique', desc: '' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition ${
                      scope === opt.value
                        ? 'border-[#3B82F6] bg-blue-50 text-[#1D4ED8]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Magasins <span className="text-red-500">*</span>
                </p>
                {stores.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#3B82F6] hover:text-[#2563EB]">
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.length === stores.length}
                      onChange={(e) =>
                        setSelectedStoreIds(e.target.checked ? stores.map(s => s.id) : [])
                      }
                      className="h-3 w-3 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    Tout sélectionner
                  </label>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-1">
                {stores.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">Aucun magasin disponible.</p>
                ) : (
                  <div className="space-y-0.5">
                    {stores.map((m) => {
                      const checked = selectedStoreIds.includes(m.id)
                      return (
                        <label
                          key={m.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                            checked ? 'bg-[#3B82F6]/10 text-[#1D4ED8] font-medium' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedStoreIds((prev) =>
                                e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                          />
                          <span className="flex-1 truncate">{m.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              {selectedStoreIds.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Veuillez sélectionner au moins un magasin.</p>
              )}
            </div>

            {scope === 'specific' && selectedStoreIds.length === 0 && (
              <p className="text-xs italic text-gray-400">
                Sélectionnez d'abord un magasin pour voir les articles disponibles.
              </p>
            )}
            {scope === 'specific' && selectedStoreIds.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Articles <span className="text-red-500">*</span>
                  </p>
                  {productList.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#3B82F6] hover:text-[#2563EB]">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.length === productList.length && productList.length > 0}
                        onChange={(e) =>
                          setSelectedProductIds(e.target.checked ? productList.map(p => p.id) : [])
                        }
                        className="h-3 w-3 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                      />
                      Tout sélectionner
                    </label>
                  )}
                </div>

                {categoryOptions.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-xs text-gray-500">
                      Sélection rapide par catégorie (prend tous les articles de la catégorie) :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryOptions.map((cat) => {
                        const allSelected = cat.productIds.every((id) => selectedProductIds.includes(id))
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategorySelection(cat.productIds)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              allSelected
                                ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {cat.name} ({cat.productIds.length})
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200">
                  <div className="border-b border-gray-200 bg-gray-50/50 p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un article..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    {loadingProducts ? (
                      <p className="py-4 text-center text-xs text-gray-400">Chargement…</p>
                    ) : productList.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">Aucun article pour ces magasins.</p>
                    ) : (
                      <div className="space-y-0.5">
                        {(() => {
                          const filtered = productList.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          if (filtered.length === 0) return <p className="py-4 text-center text-xs text-gray-400">Aucun article trouvé.</p>
                          return filtered.map((p) => {
                            const checked = selectedProductIds.includes(p.id)
                            return (
                              <label
                                key={p.id}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                                  checked ? 'bg-[#3B82F6]/10 text-[#1D4ED8] font-medium' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setSelectedProductIds((prev) =>
                                      e.target.checked
                                        ? [...prev, p.id]
                                        : prev.filter((id) => id !== p.id)
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                                />
                                <span className="flex-1 truncate">{p.name}</span>
                              </label>
                            )
                          })
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                {selectedProductIds.length === 0 && (
                  <p className="mt-1 text-xs text-red-500">Veuillez sélectionner au moins un article.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Durée de validité ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowValidity(v => !v)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                showValidity
                  ? 'border-[#3B82F6] bg-blue-50 text-[#1D4ED8]'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Durée de validité
                {!showValidity && <span className="text-xs font-normal text-gray-400">(optionnel)</span>}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showValidity ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {showValidity && (
              <div className="mt-3 space-y-4">

                {/* Mode */}
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'ponctuelle', label: 'Ponctuelle', desc: 'Du … au …' },
                      { value: 'recurrente', label: 'Récurrente', desc: 'Quotidien, hebdo…' },
                    ] as const).map((opt) => (
                      <button key={opt.value} type="button" onClick={() => switchValidityMode(opt.value)}
                        className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition ${validityMode === opt.value ? 'border-[#3B82F6] bg-blue-50 text-[#1D4ED8]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span className="text-xs opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── PONCTUELLE ── */}
                {validityMode === 'ponctuelle' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Période</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Du</label>
                        <input type="datetime-local" value={ponctuellStartsAt}
                          onChange={(e) => setPonctuellStartsAt(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Au</label>
                        <input type="datetime-local" value={ponctuellEndsAt}
                          onChange={(e) => setPonctuellEndsAt(e.target.value)}
                          min={ponctuellStartsAt}
                          className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── RECURRENTE ── */}
                {validityMode === 'recurrente' && (
                  <div className="space-y-4">

                    {/* Fréquence */}
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Fréquence</p>
                      <select value={validityFrequency} onChange={(e) => setValidityFrequency(e.target.value as ValidityFrequency)}
                        aria-label="Fréquence de récurrence"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">
                        {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>

                    {/* Période globale */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Période globale <span className="font-normal normal-case text-gray-400">(optionnel)</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Du</label>
                          <input type="date" value={recurGlobalStart} onChange={(e) => setRecurGlobalStart(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Au</label>
                          <input type="date" value={recurGlobalEnd} min={recurGlobalStart} onChange={(e) => setRecurGlobalEnd(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                        </div>
                      </div>
                    </div>

                    {/* Plage horaire */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plage horaire <span className="font-normal normal-case text-gray-400">(vide = toute la journée)</span></p>
                      <div className="flex items-center gap-2">
                        <input type="time" value={recurTimeFrom} onChange={(e) => setRecurTimeFrom(e.target.value)} aria-label="Heure de début"
                          className="flex-1 rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                        <span className="text-xs text-gray-400">à</span>
                        <input type="time" value={recurTimeTo} onChange={(e) => setRecurTimeTo(e.target.value)} aria-label="Heure de fin"
                          className="flex-1 rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
                      </div>
                    </div>

                    {/* Jours de la semaine (hebdomadaire) */}
                    {validityFrequency === 'hebdomadaire' && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Jours</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map(({ label, iso }) => (
                            <button key={iso} type="button" onClick={() => toggleDayOfWeek(iso)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${daysOfWeek.includes(iso) ? 'border-[#3B82F6] bg-[#3B82F6] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Jours du mois (mensuelle) */}
                    {validityFrequency === 'mensuelle' && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Jours du mois</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <button key={day} type="button" onClick={() => toggleDayOfMonth(day)}
                              className={`h-7 w-7 rounded-md border text-xs font-medium transition ${daysOfMonth.includes(day) ? 'border-[#3B82F6] bg-[#3B82F6] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates annuelles (annuelle) */}
                    {validityFrequency === 'annuelle' && (
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Dates</p>
                        <div className="space-y-2">
                          {annualDates.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <select value={entry.month} onChange={(e) => setAnnualDates(prev => prev.map((d, i) => i === idx ? { ...d, month: Number(e.target.value) } : d))}
                                aria-label={`Mois de la date ${idx + 1}`}
                                className="flex-1 rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                              </select>
                              <select value={entry.day} onChange={(e) => setAnnualDates(prev => prev.map((d, i) => i === idx ? { ...d, day: Number(e.target.value) } : d))}
                                aria-label={`Jour de la date ${idx + 1}`}
                                className="w-20 rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <button type="button" onClick={() => setAnnualDates(prev => prev.filter((_, i) => i !== idx))}
                                aria-label="Supprimer cette date" className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setAnnualDates(prev => [...prev, { month: 1, day: 1 }])}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700">
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter une date
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}
          </div>

          {/* ── Footer buttons ── */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                selectedStoreIds.length === 0 ||
                (scope === 'specific' && selectedProductIds.length === 0)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      <DataTable<Discount>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="reductions"
        searchable
        searchPlaceholder="Rechercher une réduction…"
        pagination={false}
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: setPage,
                disabled: loading,
              }
            : undefined
        }
        emptyMessage="Aucune réduction."
        getRowId={(d) => d.id}
      />
    </div>
  )
}
