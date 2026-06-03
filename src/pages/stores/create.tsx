import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { createStore, updateStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Store } from '../../types/api'
import { STORE_STATUS_OPTIONS } from './constants'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'

export interface StoreCreateModalProps {
  open: boolean
  /** `null` = création ; sinon édition. */
  store: Store | null
  onClose: () => void
  onSaved: () => void
}

export function StoreCreateModal({
  open,
  store,
  onClose,
  onSaved,
}: StoreCreateModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [token, setToken] = useState('')
  const [isPurchasingCenter, setIsPurchasingCenter] = useState(false)
  const [status, setStatus] = useState('active')
  const [commissionRate, setCommissionRate] = useState<string>('')

  const isEdit = store !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, store?.id])

  useEffect(() => {
    if (!open) return
    if (!store) {
      setName('')
      setAddress('')
      setPhone('')
      setToken('')
      setIsPurchasingCenter(false)
      setStatus('active')
      setCommissionRate('')
      return
    }
    setName(store.name)
    setAddress(store.address ?? '')
    setPhone(store.phone ?? '')
    setToken(store.token ?? '')
    setIsPurchasingCenter(store.is_purchasing_center)
    setStatus(store.status || 'active')
    setCommissionRate(store.commission_rate != null ? String(store.commission_rate) : '')
  }, [open, store])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      phone: telephoneForApi(phone),
      token: token.trim() || null,
      is_purchasing_center: isPurchasingCenter,
      status,
      commission_rate: commissionRate !== '' ? parseFloat(commissionRate) : null,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && store) {
        await updateStore(store.id, payload)
      } else {
        await createStore(payload)
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
      title={isEdit ? 'Modifier le magasin' : 'Nouveau magasin'}
      subtitle={
        isEdit && store ? store.name : 'Créez un point de vente ou un entrepôt.'
      }
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
        key={isEdit && store ? `edit-${store.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="store-form-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              id="store-form-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. Magasin centre-ville"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="store-form-address"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Adresse
            </label>
            <textarea
              id="store-form-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Rue, ville…"
            />
          </div>
          <div>
            <label
              htmlFor="store-form-phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Téléphone
            </label>
            <PhoneInput
              id="store-form-phone"
              value={phone}
              onChange={setPhone}
              placeholder="01 97 00 00 00"
              className="rounded-lg"
            />
          </div>
          <div>
            <label
              htmlFor="store-form-token"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Token
            </label>
            <input
              id="store-form-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. STORE_ABC_123"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="store-form-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Statut
            </label>
            <select
              id="store-form-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            >
              {!STORE_STATUS_OPTIONS.some((o) => o.value === status) &&
              status ? (
                <option value={status}>{status} (actuel)</option>
              ) : null}
              {STORE_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="store-form-commission"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Taux de commission (%)
            </label>
            <input
              id="store-form-commission"
              type="number"
              min="0"
              max="100"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. 5.00"
            />
          </div>
          <div className="flex items-center sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isPurchasingCenter}
                onChange={(e) => setIsPurchasingCenter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Central d'achat
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer le magasin'}
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
