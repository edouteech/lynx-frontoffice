import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { registerOrganization } from '../../api/register'
import { getApiErrorMessage } from '../../lib/apiError'
import { CURRENCY_OPTIONS } from '../../lib/registerFormOptions'
import LoadingScreen from '../../components/LoadingScreen'
import { CountrySelect } from '../../components/CountrySelect'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'

function RegisterForm() {
  const { applyAuthResponse, user, bootstrapping } = useAuth()
  const navigate = useNavigate()
  const { executeRecaptcha } = useGoogleReCaptcha()

  const [organizationName, setOrganizationName] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerDisplayName, setOwnerDisplayName] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (!country.trim()) {
      setError('Veuillez sélectionner un pays.')
      return
    }

    setSubmitting(true)
    try {
      const recaptchaToken = await executeRecaptcha('register')
      const data = await registerOrganization({
        name: organizationName,
        country,
        currency,
        email,
        password,
        phone: telephoneForApi(phone),
        owner_name: ownerDisplayName.trim() || null,
        recaptcha_token: recaptchaToken,
      })
      applyAuthResponse({ token: data.token, user: data.user })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
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
            Créer mon entreprise
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Votre compte <strong>propriétaire</strong> est créé en même temps que
            l’entreprise et le magasin principal.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Besoin d’une validation Lynx avant d’accéder au compte ?{' '}
            <Link
              to="/register-request"
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Soumettre une demande d’ouverture
            </Link>
          </p>
        </div>

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
                  Inscription entreprise
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Identité et paramètres régionaux de la société.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reg-nom-entreprise"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nom de l’entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-nom-entreprise"
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
                    htmlFor="reg-pays"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Pays <span className="text-red-500">*</span>
                  </label>
                  <CountrySelect
                    id="reg-pays"
                    value={country}
                    onChange={setCountry}
                    allowClear={false}
                    placeholder="Choisir un pays…"
                    className="rounded-lg [&_button]:rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-devise"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Devise <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="reg-devise"
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
                  Identifiants du rôle Propriétaire (créé avec l’entreprise).
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-email"
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
                    htmlFor="reg-tel"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Téléphone
                  </label>
                  <PhoneInput
                    id="reg-tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="01 97 00 00 00"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-proprio-nom"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nom affiché du propriétaire{' '}
                    <span className="font-normal text-gray-500">
                      (optionnel)
                    </span>
                  </label>
                  <input
                    id="reg-proprio-nom"
                    value={ownerDisplayName}
                    onChange={(e) => setOwnerDisplayName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    placeholder="Par défaut : nom de l’entreprise"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-password"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    placeholder="8 caractères minimum"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-password-2"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Confirmer le mot de passe{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reg-password-2"
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="block w-full rounded-xl bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? 'Création en cours…' : 'Créer mon entreprise'}
            </button>
          </div>
        </form>

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

export default function Register() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
    >
      <RegisterForm />
    </GoogleReCaptchaProvider>
  )
}
