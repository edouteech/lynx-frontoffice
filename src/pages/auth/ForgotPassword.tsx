import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/apiError'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'

function ForgotPasswordForm() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    setSubmitting(true)
    try {
      if (!executeRecaptcha) {
        throw new Error("reCAPTCHA n'est pas encore prêt. Veuillez réessayer.")
      }
      const recaptchaToken = await executeRecaptcha('forgot_password')
      await requestPasswordReset(email, recaptchaToken)
      setSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Une erreur est survenue.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F2E4A]/95 via-[#0F2E4A]/85 to-[#3B82F6]/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className=" mb-4 inline-flex rounded-lg bg-[#0F2E4A] px-5 py-2">
            <span className="text-lg font-bold text-white">Lynx</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Saisissez l’adresse e-mail de votre compte. Si elle est reconnue, vous
            recevrez un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
              role="status"
            >
              Si un compte existe pour cette adresse, un e-mail de réinitialisation
              vient de vous être envoyé. Pensez à vérifier vos courriers indésirables.
            </div>
            <Link
              to="/login"
              className="inline-block text-sm font-medium text-[#3B82F6] hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <div
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="vous@exemple.com"
              />
            </div>
            <div className="flex flex-col items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="block w-full rounded-xl bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </div>
          </form>
        )}

        {!sent && (
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link
              to="/login"
              className="font-medium text-[#3B82F6] hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function ForgotPassword() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
    >
      <ForgotPasswordForm />
    </GoogleReCaptchaProvider>
  )
}
