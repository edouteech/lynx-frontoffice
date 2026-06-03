import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { createCashRegister, updateCashRegister } from '../../api/cashRegisters'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegister, Store } from '../../types/api'
import { CASH_REGISTER_STATUS_OPTIONS } from './constants'

export interface CashRegisterCreateModalProps {
  open: boolean
  /** `null` = création ; sinon édition. */
  cashRegister: CashRegister | null
  onClose: () => void
  onSaved: () => void
}

export function CashRegisterCreateModal({
  open,
  cashRegister,
  onClose,
  onSaved,
}: CashRegisterCreateModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [reference, setReference] = useState('')
  const [storeId, setStoreId] = useState<string>('')
  const [status, setStatus] = useState<string>('active')
  const [isAvailable, setIsAvailable] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [storesLoading, setStoresLoading] = useState(false)
  const [storesError, setStoresError] = useState<string | null>(null)

  const isEdit = cashRegister !== null

  const subtitle = useMemo(() => {
    if (isEdit && cashRegister) return `Caisse n°${cashRegister.id}`
    return 'Créez une caisse et assignez-la à un magasin.'
  }, [isEdit, cashRegister])

  useEffect(() => {
    if (open) setError(null)
  }, [open, cashRegister?.id])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function run() {
      setStoresLoading(true)
      setStoresError(null)
      try {
        const res = await fetchStores(1)
        if (!cancelled) setStores(res.data)
      } catch (e) {
        if (!cancelled) {
          setStores([])
          setStoresError(getApiErrorMessage(e))
        }
      } finally {
        if (!cancelled) setStoresLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!cashRegister) {
      setName('')
      setReference('')
      setStoreId('')
      setStatus('active')
      setIsAvailable(true)
      return
    }
    setName(cashRegister.name)
    setReference(cashRegister.reference ?? '')
    setStoreId(String(cashRegister.store_id))
    setStatus(cashRegister.status || 'active')
    setIsAvailable(cashRegister.is_available ?? true)
  }, [open, cashRegister])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        reference: reference.trim() || null,
        store_id: storeId.trim(),
        status,
        is_available: isAvailable,
      }
      if (isEdit && cashRegister) {
        await updateCashRegister(cashRegister.id, payload)
      } else {
        await createCashRegister(payload)
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
      title={isEdit ? 'Modifier la caisse' : 'Nouvelle caisse'}
      subtitle={subtitle}
      maxWidthClassName="max-w-xl"
    >
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label
            htmlFor="cash-register-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="cash-register-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            placeholder="Ex. Caisse principale"
          />
        </div>

        <div>
          <label
            htmlFor="cash-register-reference"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Référence <span className="text-xs font-normal text-gray-400">(facultatif — utilisée dans le n° de facture)</span>
          </label>
          <input
            id="cash-register-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={20}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            placeholder="Ex. CAISSE1, A, 01…"
          />
          <p className="mt-1 text-xs text-gray-400">
            Sans référence, le numéro de caisse ({isEdit ? `#${cashRegister?.id}` : '#ID'}) sera utilisé.
          </p>
        </div>

        <div>
          <label
            htmlFor="cash-register-store"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Magasin <span className="text-red-500">*</span>
          </label>
          <select
            id="cash-register-store"
            required
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            disabled={storesLoading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 disabled:opacity-60"
          >
            <option value="">
              {storesLoading ? 'Chargement des magasins…' : 'Sélectionner…'}
            </option>
            {stores.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          {storesError ? (
            <p className="mt-1 text-xs text-red-600">{storesError}</p>
          ) : stores.length === 0 && !storesLoading ? (
            <p className="mt-1 text-xs text-gray-500">
              Aucun magasin disponible.{' '}
              <Link
                to="/stores"
                className="font-medium text-[#3B82F6] hover:underline"
              >
                Créer un magasin
              </Link>
              .
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              La caisse sera rattachée au magasin sélectionné.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cash-register-status"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Statut
          </label>
          <select
            id="cash-register-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
          >
            {CASH_REGISTER_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Disponibilité</label>
          <div className="flex gap-2">
            {[
              { value: true,  label: 'Disponible' },
              { value: false, label: 'Occupée'    },
            ].map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setIsAvailable(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors
                  ${isAvailable === opt.value
                    ? opt.value
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer la caisse'}
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
