import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import { createSupplier, updateSupplier } from '../../api/suppliers'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Supplier } from '../../types/api'

export interface SupplierModalProps {
  open: boolean
  supplier: Supplier | null
  onClose: () => void
  onSaved: () => void
}

export function SupplierModal({ open, supplier, onClose, onSaved }: SupplierModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [note, setNote] = useState('')

  const isEdit = supplier !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, supplier?.id])

  useEffect(() => {
    if (!open) return
    if (!supplier) {
      setName('')
      setContactName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setTaxId('')
      setNote('')
      return
    }
    setName(supplier.name)
    setContactName(supplier.contact_name ?? '')
    setEmail(supplier.email ?? '')
    setPhone(supplier.phone ?? '')
    setAddress(supplier.address ?? '')
    setTaxId(supplier.tax_id ?? '')
    setNote(supplier.note ?? '')
  }, [open, supplier])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: name.trim(),
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
      phone: telephoneForApi(phone),
      address: address.trim() || null,
      tax_id: taxId.trim() || null,
      note: note.trim() || null,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && supplier) {
        await updateSupplier(supplier.id, payload)
      } else {
        await createSupplier(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30'
  const lbl = 'mb-1 block text-sm font-medium text-gray-700'

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={submitting}
      title={isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      subtitle={
        isEdit && supplier
          ? supplier.name
          : 'Ajoutez un fournisseur à votre organisation.'
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <form
        key={isEdit && supplier ? `edit-${supplier.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Nom du fournisseur */}
          <div className="sm:col-span-2">
            <label htmlFor="sup-name" className={lbl}>
              Nom du fournisseur <span className="text-red-500">*</span>
            </label>
            <input
              id="sup-name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inp}
              placeholder="Ex. SONAC"
            />
          </div>

          {/* Contact */}
          <div>
            <label htmlFor="sup-contact" className={lbl}>Nom du contact</label>
            <input
              id="sup-contact"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className={inp}
              placeholder="Ex. Jean Dupont"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="sup-email" className={lbl}>Email</label>
            <input
              id="sup-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inp}
              placeholder="contact@fournisseur.com"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label htmlFor="sup-phone" className={lbl}>Téléphone</label>
            <PhoneInput
              id="sup-phone"
              value={phone}
              onChange={setPhone}
              placeholder="01 97 …"
              className="rounded-lg"
            />
          </div>

          {/* IFU */}
          <div>
            <label htmlFor="sup-tax" className={lbl}>IFU</label>
            <input
              id="sup-tax"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              className={inp}
              placeholder="Identifiant fiscal unique"
            />
          </div>

          {/* Adresse */}
          <div className="sm:col-span-2">
            <label htmlFor="sup-address" className={lbl}>Adresse</label>
            <input
              id="sup-address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={inp}
              placeholder="Ex. Avenue de la Paix, Cotonou"
            />
          </div>

          {/* Note */}
          <div className="sm:col-span-2">
            <label htmlFor="sup-note" className={lbl}>Note</label>
            <textarea
              id="sup-note"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              className={inp}
              placeholder="Remarques, conditions de paiement…"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : 'Créer le fournisseur'}
          </button>
          <button
            type="button"
            onClick={() => { if (!submitting) onClose() }}
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
