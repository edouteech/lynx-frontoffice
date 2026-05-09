import {
  Store,
  Banknote,
  Plus,
  Download,
  TrendingUp,
  Package,
  BarChart3,
  Wallet,
  Users,
} from 'lucide-react'

/**
 * Tableau de bord Lynx — données statiques (aucun appel API).
 * Les indicateurs reflètent le périmètre magasins / catégories / caisses / équipe.
 */
export default function Dashboard() {
  const stats = [
    {
      title: 'Magasins actifs',
      value: '12',
      change: '+2 ce trimestre',
      icon: Store,
    },
    {
      title: 'Catégories',
      value: '24',
      change: 'Structuration catalogue',
      icon: Package,
    },
    {
      title: 'Caisses configurées',
      value: '28',
      icon: Wallet,
    },
    {
      title: 'Utilisateurs',
      value: '56',
      change: 'Rôles par magasin',
      icon: Users,
    },
  ]

  const recentActivity = [
    {
      user: 'K. Traoré',
      action: 'Mise à jour stock magasin Centre-ville',
      time: 'Il y a 1 h',
    },
    {
      user: 'M. Diallo',
      action: 'Catégorie « Boissons » mise à jour',
      time: 'Il y a 3 h',
    },
    {
      user: 'A. Koné',
      action: 'Rôle caissier assigné (Magasin Nord)',
      time: 'Il y a 5 h',
    },
    {
      user: 'Système',
      action: 'Paramètre TVA modifié',
      time: 'Hier',
    },
  ]

  const barData = [
    { month: 'Jan', value: 14, height: 35 },
    { month: 'Fév', value: 22, height: 55 },
    { month: 'Mar', value: 18, height: 45 },
    { month: 'Avr', value: 30, height: 75 },
    { month: 'Mai', value: 24, height: 60 },
    { month: 'Juin', value: 28, height: 70 },
  ]

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="mb-2 text-3xl font-semibold text-gray-900">
              Tableau de bord
            </h1>
            <p className="text-gray-600">
              Vue d’ensemble de votre activité retail (données de démonstration).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]"
            >
              <Plus className="h-4 w-4" />
              Nouveau magasin
            </button>
          </div>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Icon className="h-6 w-6 text-[#3B82F6]" />
                </div>
              </div>
              {stat.change ? (
                <p className="mt-4 text-sm text-gray-500">{stat.change}</p>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Mouvements par mois (exemple)
              </h3>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <select
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  aria-label="Période du graphique"
                >
                  <option>6 derniers mois</option>
                  <option>12 derniers mois</option>
                </select>
              </div>
            </div>

            <div className="flex h-64 items-end justify-between gap-4 px-4">
              {barData.map((item, index) => (
                <div key={index} className="flex flex-1 flex-col items-center">
                  <div className="mb-2 text-xs text-gray-600 opacity-0 transition-opacity hover:opacity-100">
                    {item.value} ops.
                  </div>
                  <div
                    className="w-full min-h-[20px] cursor-pointer rounded-t bg-[#3B82F6] transition-colors hover:bg-[#2563EB]"
                    style={{ height: `${item.height}%` }}
                  />
                  <div className="mt-2 text-xs font-medium text-gray-600">
                    {item.month}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Actions rapides
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <button
                type="button"
                className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                  <Store className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Ouvrir magasins
                </div>
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded bg-sky-100">
                  <Package className="h-4 w-4 text-[#0F2E4A]" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Nouvelle catégorie
                </div>
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded bg-indigo-100">
                  <Wallet className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Gérer les caisses
                </div>
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded bg-cyan-100">
                  <TrendingUp className="h-4 w-4 text-cyan-700" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Rapports
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Activité récente
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <div className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {activity.user}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {activity.action}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
            >
              Voir toute l’activité
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-600">
            <p className="flex items-center gap-2 font-medium text-gray-800">
              <Banknote className="h-4 w-4 text-[#3B82F6]" />
              Rappel API
            </p>
            <p className="mt-2 leading-relaxed">
              Les écrans du menu correspondent aux ressources{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">
                /stores
              </code>
              ,{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">
                /item-categories
              </code>
              ,{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">
                /cash-registers
              </code>
              ,
              etc. Brancher ensuite Sanctum et les appels Laravel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
