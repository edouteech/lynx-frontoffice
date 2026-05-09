import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>
      <div className="rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 max-w-xl text-gray-600">
          Écran réservé au design et à la navigation. L’intégration avec l’API
          Lynx (CRUD, listes, formulaires) viendra dans une prochaine étape.
        </p>
      </div>
    </div>
  )
}
