import { useNavigate } from 'react-router-dom'
import { AlertOctagon, LogOut, CreditCard } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'

export default function SuspendedPage() {
  const navigate = useNavigate()
  const { currentOrganization, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-red-100">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertOctagon className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Compte Suspendu
          </h2>
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">
            L'accès à l'espace de l'entreprise <strong className="text-gray-900">{currentOrganization?.name}</strong> a été temporairement restreint.
          </p>
          <div className="mt-4 rounded-xl bg-red-50 p-4 border border-red-100">
            <p className="text-sm text-red-800">
              Cette suspension est due à un <strong>retard de paiement</strong> dont le délai de grâce a été dépassé.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => navigate('/settings/subscription')}
            className="group relative flex w-full justify-center rounded-xl border border-transparent bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <CreditCard className="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" aria-hidden="true" />
            </span>
            Régulariser ma facture
          </button>
          
          <button
            onClick={() => logout()}
            className="group relative flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <LogOut className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
            </span>
            Déconnexion
          </button>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          Besoin d'aide ? Contactez le support Lynx Desk.
        </p>
      </div>
    </div>
  )
}
