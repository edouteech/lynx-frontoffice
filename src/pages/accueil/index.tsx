import { useAuth } from '../../contexts/useAuth'

export default function AccueilPage() {
  const { user, currentOrganization } = useAuth()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#EFF6FF] p-8">
      {/* Carte principale */}
      <div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white p-10 shadow-xl">
        {/* En-tête */}
        <div className="mb-8 text-center">
          {currentOrganization?.logo ? (
            <img
              src={currentOrganization.logo}
              alt={currentOrganization.name}
              className="mx-auto mb-4 h-16 object-contain"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F2E4A] text-2xl font-bold text-white shadow-lg">
              {currentOrganization?.name?.[0] ?? 'L'}
            </div>
          )}
          <h1 className="text-3xl font-bold text-[#0F2E4A]">
            {greeting}, {user?.name?.split(' ')[0] ?? 'employé(e)'}&nbsp;👋
          </h1>
          <p className="mt-2 text-gray-500">
            Vous êtes connecté(e).
          </p>
        </div>
      </div>
    </div>
  )
}
