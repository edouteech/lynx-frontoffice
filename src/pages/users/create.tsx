import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import {
  attachExistingUserToOrganization,
  checkUserEmail,
  createUser,
  updateUser,
  type UserEmailCheckResponse,
} from '../../api/users'
import { PhoneInput } from '../../components/PhoneInput'
import { PasswordInput } from '../../components/PasswordInput'
import { telephoneForApi } from '../../lib/phoneValue'
import { getApiErrorMessage } from '../../lib/apiError'
import type { User } from '../../types/api'

export interface UserCreateModalProps {
  open: boolean
  user: User | null
  onClose: () => void
  onSaved: () => void
}

export function UserCreateModal({
  open,
  user,
  onClose,
  onSaved,
}: UserCreateModalProps) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [emailCheck, setEmailCheck] = useState<UserEmailCheckResponse | null>(
    null
  )
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [note, setNote] = useState('')

  const isEdit = user !== null
  const canShowCreateForm =
    isEdit || (emailCheck?.status === 'not_found' && showCreateForm)

  useEffect(() => {
    if (open) {
      setError(null)
      setEmailCheck(null)
      setShowCreateForm(false)
    }
  }, [open, user?.id])

  useEffect(() => {
    if (!open) return
    if (!user) {
      setFullName('')
      setEmail('')
      setPassword('')
      setPhone('')
      setPinCode('')
      setNote('')
      setEmailCheck(null)
      setShowCreateForm(false)
      return
    }
    setFullName(user.name)
    setEmail(user.email)
    setPassword('')
    setPhone(user.phone ?? '')
    setPinCode(user.pin_code ?? '')
    setNote(user.note ?? '')
  }, [open, user])

  useEffect(() => {
    if (!emailCheck) return
    // Reset the check result if the email changes.
    if (email.trim().toLowerCase() !== emailCheck.email.toLowerCase()) {
      setEmailCheck(null)
      setShowCreateForm(false)
    }
  }, [email, emailCheck])

  async function handleCheckEmail() {
    if (isEdit) return
    const v = email.trim()
    if (!v) {
      setError("Veuillez saisir une adresse email.")
      return
    }
    setError(null)
    setShowCreateForm(false)
    setCheckingEmail(true)
    try {
      const r = await checkUserEmail(v)
      setEmailCheck(r)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setCheckingEmail(false)
    }
  }

  async function handleAttachExisting(emailToAttach: string) {
    setError(null)
    setSubmitting(true)
    try {
      await attachExistingUserToOrganization({ email: emailToAttach })
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isEdit && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (isEdit && password !== '' && password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        const body: Parameters<typeof updateUser>[1] = {
          name: fullName.trim(),
          email: email.trim(),
          phone: telephoneForApi(phone),
          note: note.trim() || null,
        }
        if (password.trim()) body.password = password.trim()
        if (pinCode.trim()) body.pin_code = pinCode.trim()
        await updateUser(user.id, body)
      } else {
        await createUser({
          name: fullName.trim(),
          email: email.trim(),
          password: password,
          phone: telephoneForApi(phone),
          pin_code: pinCode.trim() || null,
          note: note.trim() || null,
        })
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
      title={isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
      subtitle={
        isEdit && user
          ? user.name
          : 'Créez un compte pour un collaborateur de votre entreprise.'
      }
    >
      {!isEdit && !showCreateForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <p className="text-sm font-medium text-gray-900">
            Rechercher par email
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Saisissez l’email, puis vérifiez s’il existe déjà.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="user-email-search"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="user-email-search"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                placeholder="ex. utilisateur@domaine.com"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCheckEmail()}
              disabled={checkingEmail || submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {checkingEmail ? 'Vérification…' : 'Vérifier'}
            </button>
          </div>

          {emailCheck?.status === 'not_found' && (
            <div
              className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              role="status"
            >
              <p>
                Cet email n’existe pas encore, vous pouvez créer un nouvel utilisateur
                avec cette adresse.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Créer un nouvel utilisateur
                </button>
              </div>
            </div>
          )}

          {emailCheck?.status === 'in_current_organization' && emailCheck.user && (
            <div
              className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-950"
              role="status"
            >
              <p className="font-medium">Cet email existe déjà dans votre entreprise.</p>
              <p className="mt-1 text-blue-900">
                « {emailCheck.user.name} » ({emailCheck.user.email})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(`/users/${emailCheck.user.id}`)
                  }}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Voir les informations
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100"
                >
                  Annuler la création
                </button>
              </div>
            </div>
          )}

          {emailCheck?.status === 'in_another_organization' && emailCheck.user && (
            <div
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
              role="status"
            >
              <p className="font-medium">
                Cet email existe déjà dans le système tyva
              </p>
              <p className="mt-1 text-amber-900">
                « {emailCheck.user.name} » ({emailCheck.user.email})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleAttachExisting(emailCheck.user.email)
                  }}
                  disabled={submitting}
                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  Ajouter cet utilisateur à votre entreprise
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}
      {canShowCreateForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="user-full-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Nom
          </label>
          <input
            id="user-full-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            disabled={!isEdit && emailCheck?.status === 'in_current_organization'}
          />
        </div>
        <div>
          <label
            htmlFor="user-email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="user-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            disabled={!isEdit && emailCheck?.status === 'in_current_organization'}
          />
        </div>
        <div>
          <label
            htmlFor="user-password"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Mot de passe {isEdit ? '(laisser vide pour ne pas changer)' : ''}
          </label>
          <PasswordInput
            id="user-password"
            autoComplete="new-password"
            required={!isEdit}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            disabled={!isEdit && emailCheck?.status === 'in_current_organization'}
          />
        </div>
        <div>
          <label
            htmlFor="user-tel"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Téléphone
          </label>
          <div
            className={
              !isEdit && emailCheck?.status === 'in_current_organization'
                ? 'pointer-events-none opacity-60'
                : ''
            }
          >
            <PhoneInput
              id="user-tel"
              value={phone}
              onChange={setPhone}
              placeholder="01 97 …"
              className="rounded-lg"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="user-pin"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Code PIN
          </label>
          <input
            id="user-pin"
            type="text"
            placeholder="ex. 1234"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            disabled={!isEdit && emailCheck?.status === 'in_current_organization'}
          />
        </div>
        <div>
          <label
            htmlFor="user-note"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Remarque
          </label>
          <textarea
            id="user-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            disabled={!isEdit && emailCheck?.status === 'in_current_organization'}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
          >
            {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
        </form>
      ) : null}
    </Modal>
  )
}
