import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { createPaymentMethod, updatePaymentMethod } from '../../api/paymentMethods'
import { fetchPaymentMethodCategories } from '../../api/paymentMethodCategories'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PaymentMethod, PaymentMethodCategory, Store } from '../../types/api'

export interface PaymentMethodCreateModalProps {
  open: boolean
  paymentMethod: PaymentMethod | null
  onClose: () => void
  onSaved: () => void
}

export function PaymentMethodCreateModal({
  open,
  paymentMethod,
  onClose,
  onSaved,
}: PaymentMethodCreateModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [token, setToken] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [categories, setCategories] = useState<PaymentMethodCategory[]>([])

  const isEdit = paymentMethod !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, paymentMethod?.id])

  useEffect(() => {
    let cancelled = false
    async function loadRefs() {
      if (!open) return
      try {
        const [mRes, cRes] = await Promise.all([
          fetchStores(1),
          fetchPaymentMethodCategories(1),
        ])
        if (cancelled) return
        setStores(mRes.data ?? [])
        setCategories(cRes.data ?? [])
      } catch {
        // silencieux : on gère via l'erreur submit si besoin
      }
    }
    void loadRefs()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!paymentMethod) {
      setName('')
      setAccountNumber('')
      setToken('')
      setCategoryId('')
      setSelectedStoreIds([])
      return
    }
    setName(paymentMethod.name)
    setAccountNumber(paymentMethod.account_number ?? '')
    setToken(paymentMethod.token ?? '')
    setCategoryId(paymentMethod.payment_method_category_id)
    setSelectedStoreIds((paymentMethod.stores ?? []).map((m) => m.id))
  }, [open, paymentMethod])

  const categoryOptions = useMemo(() => {
    const list = categories.filter((c) => c.is_available)
    return list.length ? list : categories
  }, [categories])

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const isCustomerBalanceCategory = selectedCategory?.deducts_customer_balance ?? false

  const allStoreIds = useMemo(() => stores.map((m) => m.id), [stores])
  const allSelected =
    allStoreIds.length > 0 &&
    allStoreIds.every((id) => selectedStoreIds.includes(id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) {
      setError('Veuillez sélectionner une catégorie.')
      return
    }
    const payload = {
      name: name.trim(),
      account_number: accountNumber.trim() || null,
      token: token.trim() || null,
      payment_method_category_id: Number(categoryId),
      store_ids: selectedStoreIds,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && paymentMethod) {
        await updatePaymentMethod(paymentMethod.id, payload)
      } else {
        await createPaymentMethod(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={submitting}
      title={isEdit ? 'Modifier le moyen de paiement' : 'Nouveau moyen de paiement'}
      subtitle="Sélectionnez les magasins où il sera utilisable."
    >
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        key={isEdit && paymentMethod ? `edit-${paymentMethod.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. MTN Momo"
            />
          </div>

          {!isCustomerBalanceCategory && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Numéro
              </label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Optionnel"
              />
            </div>
          )}

          {!isCustomerBalanceCategory && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Token
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Optionnel"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              aria-label="Catégorie"
            >
              <option value="">Sélectionner…</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isCustomerBalanceCategory && (
              <p className="mt-1 text-xs text-gray-500">
                Ce type de paiement retire automatiquement le montant du solde du client sélectionné lors de la vente.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-gray-700">
                Magasins autorisés
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    const next = e.target.checked
                    setSelectedStoreIds(next ? allStoreIds : [])
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                Sélectionner tous
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {stores.map((m) => {
                const checked = selectedStoreIds.includes(m.id)
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                        setSelectedStoreIds((prev) =>
                          next ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                        )
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="truncate">{m.name}</span>
                  </label>
                )
              })}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Si aucun magasin n’est coché, le moyen ne sera disponible nulle part.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer le moyen'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose()
            }}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  )
}
