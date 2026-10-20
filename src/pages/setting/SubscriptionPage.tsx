import { useState, useEffect } from 'react'
import { Crown, AlertTriangle, CheckCircle, Clock, CreditCard } from 'lucide-react'
import { api } from '../../api/apiClient'
import type { ApiSubscription } from '../../types/api'

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<ApiSubscription>('/my-subscription')
      setSubscription(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'abonnement.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><CheckCircle className="h-3.5 w-3.5" /> Actif</span>
      case 'trial':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800"><Clock className="h-3.5 w-3.5" /> En période d'essai</span>
      case 'suspended':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800"><AlertTriangle className="h-3.5 w-3.5" /> Suspendu</span>
      case 'overdue':
        return <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800"><AlertTriangle className="h-3.5 w-3.5" /> Impayé</span>
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800"><Clock className="h-3.5 w-3.5" /> En attente</span>
      case 'paid':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><CheckCircle className="h-3.5 w-3.5" /> Payé</span>
      case 'expired':
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800"><AlertTriangle className="h-3.5 w-3.5" /> Expiré</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800">{status}</span>
    }
  }

  const translateFrequency = (freq: string) => {
    const map: Record<string, string> = {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      semiannual: 'Semestriel',
      yearly: 'Annuel'
    }
    return map[freq] || freq
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-800">Erreur</h2>
          <p className="mt-2 text-red-600">{error}</p>
          <button onClick={loadSubscription} className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Aucun abonnement n'a été trouvé pour votre compte.</p>
        </div>
      </div>
    )
  }

  const isTrial = subscription.status === 'trial'
  const isExpired = subscription.status === 'expired'

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      
      {/* Header section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:px-6 sm:py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2E4A] text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 truncate">Mon Abonnement</h1>
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 sm:line-clamp-none">
              Consultez les détails de votre forfait, vos échéances et votre historique de facturation.
            </p>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {isTrial && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div className="rounded-full bg-blue-100 p-2 shrink-0">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 text-sm sm:text-base">Vous êtes en période d'essai</h3>
            <p className="mt-1 text-xs sm:text-sm text-blue-700">
              Profitez de toutes les fonctionnalités de Lynx Desk. Votre essai se termine le <strong>{formatDate(subscription.end_date)}</strong>.
            </p>
            <p className="mt-2 text-xs sm:text-sm text-blue-600">
              Veuillez nous contacter pour choisir votre plan annuel avant l'expiration de votre essai afin d'éviter toute interruption de service.
            </p>
          </div>
        </div>
      )}

      {/* Expired Banner */}
      {isExpired && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
          <div className="rounded-full bg-red-100 p-2 shrink-0">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-900 text-sm sm:text-base">Votre abonnement est expiré</h3>
            <p className="mt-1 text-xs sm:text-sm text-red-700">
              Votre accès aux fonctionnalités est actuellement limité car votre abonnement a pris fin le <strong>{formatDate(subscription.end_date)}</strong>.
            </p>
            <p className="mt-2 text-xs sm:text-sm text-red-600">
              Veuillez contacter l'administrateur pour renouveler votre abonnement et retrouver un accès complet.
            </p>
          </div>
        </div>
      )}

      {/* Main Details Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50/50 p-4 sm:px-6 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Plan {subscription.plan?.name || 'Inconnu'}
                </h2>
                <div className="mt-0.5 flex items-center gap-2">
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
            </div>
            {!isTrial && (
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(subscription.custom_price)}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-500">
                  par an (facturé en {translateFrequency(subscription.payment_frequency).toLowerCase()})
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 divide-y border-b border-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Date de début</p>
            <p className="mt-1 sm:mt-2 font-semibold text-gray-900">{formatDate(subscription.start_date)}</p>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Date de fin</p>
            <p className="mt-1 sm:mt-2 font-semibold text-gray-900">{formatDate(subscription.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Billing Cycles (Only if not trial) */}
      {!isTrial && subscription.cycles && subscription.cycles.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50/50 p-4 sm:px-6 sm:py-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <CreditCard className="h-5 w-5 text-gray-400" />
              Vos factures et échéances
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 whitespace-nowrap">Période de facturation</th>
                  <th className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">Montant</th>
                  <th className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">Échéance</th>
                  <th className="px-4 sm:px-6 py-3.5 whitespace-nowrap">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {subscription.cycles.map((cycle) => {
                  const isCurrent = new Date() >= new Date(cycle.period_start) && new Date() <= new Date(cycle.period_end)
                  return (
                    <tr key={cycle.id} className={`hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {new Date(cycle.period_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-600">
                            {new Date(cycle.period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {isCurrent && (
                            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              En cours
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap font-medium text-gray-900">
                        {formatCurrency(cycle.amount)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap text-gray-600">
                        {formatDate(cycle.due_date)}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        {getStatusBadge(cycle.status)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
