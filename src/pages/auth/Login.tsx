import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { getApiErrorMessage } from '../../lib/apiError'
import LoadingScreen from '../../components/LoadingScreen'
import { getDefaultLandingPage } from '../../lib/permissions'

export default function Login() {
  const { login, user, activeOrganizationId, bootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!bootstrapping && user) {
      navigate(from ?? getDefaultLandingPage(user, activeOrganizationId), { replace: true })
    }
  }, [bootstrapping, user, navigate, from, activeOrganizationId])

  if (bootstrapping) {
    return <LoadingScreen />
  }

  if (user) {
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await login(email.trim(), password)
      const dest = from ?? getDefaultLandingPage(result.user, result.activeOrganizationId)
      navigate(dest, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Identifiants incorrects.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F2E4A]/95 via-[#0F2E4A]/85 to-[#3B82F6]/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <img src="/lynx_400px.png" alt="Lynx" className="h-24 w-auto" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Connexion</h1>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous avec votre compte Lynx (API Sanctum).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-[#3B82F6] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="block w-full rounded-xl bg-[#3B82F6] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link
            to="/register-request"
            className="font-medium text-[#3B82F6] hover:underline"
          >
            Demander l’ouverture d’un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
