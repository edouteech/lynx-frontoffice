import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import { createCustomer, updateCustomer } from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Customer } from '../../types/api'

export interface CustomerCreateModalProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
  onSaved: () => void
}

export function CustomerCreateModal({
  open,
  customer,
  onClose,
  onSaved,
}: CustomerCreateModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [ifu, setIfu] = useState('')
  const [note, setNote] = useState('')
  const [aib, setAib] = useState(false)

  const isEdit = customer !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, customer?.id])

  useEffect(() => {
    if (!open) return
    if (!customer) {
      setCustomerName('')
      setEmail('')
      setTelephone('')
      setIfu('')
      setNote('')
      setAib(false)
      return
    }
    setCustomerName(customer.name)
    setEmail(customer.email ?? '')
    setTelephone(customer.phone ?? '')
    setIfu(customer.tax_id ?? '')
    setNote(customer.note ?? '')
    setAib(customer.aib)
  }, [open, customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: customerName.trim(),
      email: email.trim() || null,
      phone: telephoneForApi(telephone),
      tax_id: ifu.trim() || null,
      note: note.trim() || null,
      aib,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload)
      } else {
        await createCustomer(payload)
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
      title={isEdit ? 'Modifier le client' : 'Nouveau client'}
      subtitle={isEdit && customer ? customer.name : 'Créez une fiche client.'}
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
        key={isEdit && customer ? `edit-${customer.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="customer-form-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              id="customer-form-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. Jean Dupont"
            />
          </div>

          <div>
            <label
              htmlFor="customer-form-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="customer-form-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="exemple@mail.com"
            />
          </div>

          <div>
            <label
              htmlFor="customer-form-phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Téléphone
            </label>
            <PhoneInput
              id="customer-form-phone"
              value={telephone}
              onChange={setTelephone}
              placeholder="01 97 …"
              className="rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="customer-form-tax-id"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              IFU
            </label>
            <input
              id="customer-form-tax-id"
              value={ifu}
              onChange={(e) => setIfu(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="IFU…"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="customer-form-note"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Note
            </label>
            <textarea
              id="customer-form-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Remarques…"
            />
          </div>

          <div className="flex items-center sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={aib}
                onChange={(e) => setAib(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              AIB
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer le client'}
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
