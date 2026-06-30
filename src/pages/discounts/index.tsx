import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock, Pencil, Plus, Trash2, Search } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
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
import type { Discount, Product, Store, ValidityConfig, ValidityFrequency, ValiditySlot } from '../../types/api'
import Swal from 'sweetalert2'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const FREQUENCIES: { value: ValidityFrequency; label: string }[] = [
  { value: 'quotidienne', label: 'Quotidienne' },
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'annuelle', label: 'Annuelle' },
]

const EMPTY_SLOT_PONCTUELLE: ValiditySlot = { date: '', start_time: '', end_time: '' }
const EMPTY_SLOT_RECURRENTE: ValiditySlot = { day: '', start_time: '', end_time: '' }

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
  const [validityFrequency, setValidityFrequency] = useState<ValidityFrequency>('hebdomadaire')
  const [validitySlots, setValiditySlots] = useState<ValiditySlot[]>([EMPTY_SLOT_PONCTUELLE])

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
    setLoadingProducts(true)
    fetchProducts({ page: 1, store_ids: selectedStoreIds })
      .then((res) => setProductList(res.data))
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
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
    setValidityFrequency('hebdomadaire')
    setValiditySlots([EMPTY_SLOT_PONCTUELLE])
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
      setValidityFrequency(d.validity_slots.frequency ?? 'hebdomadaire')
      setValiditySlots(d.validity_slots.slots.length > 0 ? d.validity_slots.slots : [EMPTY_SLOT_PONCTUELLE])
    } else {
      setShowValidity(false)
      setValidityMode('ponctuelle')
      setValidityFrequency('hebdomadaire')
      setValiditySlots([EMPTY_SLOT_PONCTUELLE])
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

    const validityPayload: ValidityConfig | null = showValidity
      ? {
          mode: validityMode,
          ...(validityMode === 'recurrente' ? { frequency: validityFrequency } : {}),
          slots: validitySlots,
        }
      : null

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

  function updateSlot(idx: number, patch: Partial<ValiditySlot>) {
    setValiditySlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function addSlot() {
    setValiditySlots(prev => [...prev, validityMode === 'ponctuelle' ? { ...EMPTY_SLOT_PONCTUELLE } : { ...EMPTY_SLOT_RECURRENTE }])
  }

  function removeSlot(idx: number) {
    setValiditySlots(prev => prev.filter((_, i) => i !== idx))
  }

  function switchValidityMode(m: 'ponctuelle' | 'recurrente') {
    setValidityMode(m)
    setValiditySlots([m === 'ponctuelle' ? { ...EMPTY_SLOT_PONCTUELLE } : { ...EMPTY_SLOT_RECURRENTE }])
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
        render: (v) => v
          ? <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Actif</span>
          : <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Inactif</span>,
      },
    ],
    [stores]
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
              <div className="mt-3 space-y-3">

                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'ponctuelle', label: 'Ponctuelle', desc: 'Créneaux précis' },
                      { value: 'recurrente', label: 'Récurrente', desc: 'Quotidienne, hebdo...' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => switchValidityMode(opt.value)}
                        className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition ${
                          validityMode === opt.value
                            ? 'border-[#3B82F6] bg-blue-50 text-[#1D4ED8]'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span className="text-xs opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {validityMode === 'recurrente' && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Fréquence</p>
                    <select
                      value={validityFrequency}
                      onChange={(e) => setValidityFrequency(e.target.value as ValidityFrequency)}
                      aria-label="Fréquence de récurrence"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Créneaux</p>
                  <div className="space-y-2">
                    {validitySlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {validityMode === 'ponctuelle' ? (
                          <input
                            type="date"
                            aria-label={`Date du créneau ${idx + 1}`}
                            value={slot.date ?? ''}
                            onChange={(e) => updateSlot(idx, { date: e.target.value })}
                            className="min-w-0 flex-[1.2] rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                          />
                        ) : (
                          <select
                            aria-label={`Jour du créneau ${idx + 1}`}
                            value={slot.day ?? ''}
                            onChange={(e) => updateSlot(idx, { day: e.target.value })}
                            className="min-w-0 flex-[1.2] rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                          >
                            <option value="">—</option>
                            {DAYS.map((d) => (
                              <option key={d} value={d.toLowerCase()}>{d}</option>
                            ))}
                          </select>
                        )}
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/30">
                          <input
                            type="time"
                            aria-label={`Heure de début du créneau ${idx + 1}`}
                            value={slot.start_time}
                            onChange={(e) => updateSlot(idx, { start_time: e.target.value })}
                            className="w-auto shrink-0 border-none p-0 text-sm focus:outline-none focus:ring-0"
                          />
                          <span className="shrink-0 text-xs text-gray-400">à</span>
                          <input
                            type="time"
                            aria-label={`Heure de fin du créneau ${idx + 1}`}
                            value={slot.end_time}
                            onChange={(e) => updateSlot(idx, { end_time: e.target.value })}
                            className="w-auto shrink-0 border-none p-0 text-sm focus:outline-none focus:ring-0"
                          />
                        </div>
                        {validitySlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(idx)}
                            aria-label="Supprimer le créneau"
                            className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un créneau
                  </button>
                </div>

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
