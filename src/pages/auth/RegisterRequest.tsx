import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { submitOrganizationRegistrationRequest } from '../../api/register'
import { getApiErrorMessage } from '../../lib/apiError'
import { CURRENCY_OPTIONS } from '../../lib/registerFormOptions'
import LoadingScreen from '../../components/LoadingScreen'
import { CountrySelect } from '../../components/CountrySelect'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import ReCAPTCHA from 'react-google-recaptcha'

/**
 * Inscription « sur demande » : aucun compte tant que Lynx n’a pas approuvé.
 */
export default function RegisterRequest() {
  const { user, bootstrapping } = useAuth()
  const navigate = useNavigate()

  const [organizationName, setOrganizationName] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerDisplayName, setOwnerDisplayName] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  useEffect(() => {
    if (!bootstrapping && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [bootstrapping, user, navigate])

  if (bootstrapping) {
    return <LoadingScreen />
  }

  if (user) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!country.trim()) {
      setError('Veuillez sélectionner un pays.')
      return
    }
    if (!recaptchaToken) {
      setError('Veuillez cocher la case "Je ne suis pas un robot".')
      return
    }

    setSubmitting(true)
    try {
      const data = await submitOrganizationRegistrationRequest({
        name: organizationName,
        country,
        currency,
        email,
        phone: telephoneForApi(phone),
        owner_name: ownerDisplayName.trim() || null,
        recaptcha_token: recaptchaToken,
      })
      setSuccessMessage(
        data.message ||
          'Votre demande a bien été enregistrée. Vous recevrez l’accès après validation par notre équipe.',
      )
    } catch (err) {
      setError(getApiErrorMessage(err))
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2E4A]/95 via-[#0F2E4A]/85 to-[#3B82F6]/35 px-4 py-10">
      <div className=" w-full  rounded-2xl border border-white/20 bg-white p-6 shadow-2xl sm:p-8 lg:p-10">
        <div className="mb-8 text-center">
          <div className=" mb-4 inline-flex rounded-lg bg-[#0F2E4A] px-5 py-2">
            <span className="text-lg font-bold text-white">Lynx</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Demander l’ouverture d’un compte entreprise
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Après validation par Lynx, vous recevrez un e-mail pour définir votre
            mot de passe et vous connecter.
          </p>
          {/* Création immédiate ?  
          <p className="mt-3 text-sm text-gray-500">
            Création immédiate ?{' '}
            <Link
              to="/register"
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Inscription classique
            </Link>
          </p>*/}
        </div>

        {successMessage ? (
          <div className="space-y-6 text-center">
            <div
              className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              {successMessage}
            </div>
            <p className="text-sm text-gray-600">
              Conservez votre e-mail : il servira à votre première connexion une
              fois la demande approuvée.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
            >
              Aller à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-0">
              <div className="space-y-6 lg:border-r lg:border-gray-200 lg:pr-10">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Votre entreprise
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Nom et paramètres régionaux pour la demande.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="req-nom-entreprise"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Nom de l’entreprise{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="req-nom-entreprise"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      autoComplete="organization"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      placeholder="Ex. Commerce Dupont"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-pays"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Pays <span className="text-red-500">*</span>
                    </label>
                    <CountrySelect
                      id="req-pays"
                      value={country}
                      onChange={setCountry}
                      allowClear={false}
                      placeholder="Choisir un pays…"
                      className="rounded-lg [&_button]:rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-devise"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Devise <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="req-devise"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    >
                      {CURRENCY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6 border-t border-gray-200 pt-10 lg:border-t-0 lg:pt-0 lg:pl-10">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Compte propriétaire
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    L’accès sera activé après validation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="req-email"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="req-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      placeholder="vous@exemple.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-tel"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Téléphone
                    </label>
                    <PhoneInput
                      id="req-tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="01 97 00 00 00"
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-proprio-nom"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Nom affiché du propriétaire{' '}
                      <span className="font-normal text-gray-500">
                        (optionnel)
                      </span>
                    </label>
                    <input
                      id="req-proprio-nom"
                      value={ownerDisplayName}
                      onChange={(e) => setOwnerDisplayName(e.target.value)}
                      autoComplete="name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      placeholder="Par défaut : nom de l’entreprise"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
              />
              <button
                type="submit"
                disabled={submitting || !recaptchaToken}
                className="block w-full rounded-xl bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
              >
                {submitting ? 'Envoi en cours…' : 'Envoyer ma demande'}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            className="font-medium text-[#3B82F6] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
