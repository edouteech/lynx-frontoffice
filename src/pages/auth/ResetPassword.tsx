import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPasswordWithToken } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/apiError'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const emailFromQuery = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(emailFromQuery)
  const [password, setPassword] = useState('')

  useEffect(() => {
    const e = searchParams.get('email')
    if (e) setEmail(e)
  }, [searchParams])
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const missingToken = useMemo(() => !token.trim(), [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSubmitting(true)
    try {
      await resetPasswordWithToken({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setDone(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de réinitialiser le mot de passe.'))
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
            Nouveau mot de passe
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Choisissez un mot de passe d’au moins 8 caractères.
          </p>
        </div>

        {missingToken ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-700">
              Lien incomplet ou expiré. Demandez un nouveau lien depuis la page « Mot
              de passe oublié ».
            </p>
            <Link
              to="/forgot-password"
              className="inline-block text-sm font-medium text-[#3B82F6] hover:underline"
            >
              Mot de passe oublié
            </Link>
          </div>
        ) : done ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-sm text-emerald-900"
            role="status"
          >
            Mot de passe mis à jour. Redirection vers la connexion…
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
                htmlFor="reset-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
            <div>
              <label
                htmlFor="reset-password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nouveau mot de passe
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
            <div>
              <label
                htmlFor="reset-password-2"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="reset-password-2"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="block w-full rounded-xl bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link
            to="/login"
            className="font-medium text-[#3B82F6] hover:underline"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
