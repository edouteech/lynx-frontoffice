import { useState } from 'react'
import { Building2, CheckCircle2, UserRound } from 'lucide-react'
import { createOrganization } from '../../api/organization'
import { getApiErrorMessage } from '../../lib/apiError'
import { CountrySelect } from '../../components/CountrySelect'
import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import { timezoneForApi } from '../../lib/timezone'
import { CURRENCY_OPTIONS } from '../../lib/registerFormOptions'
import { isOwnerRole } from '../../lib/ownerRole'
import { useAuth } from '../../contexts/useAuth'
import { displayRoleName } from '../../lib/ownerRole'
import Swal from 'sweetalert2'

export default function UserProfilePage() {
  const {
    user,
    activeOrganizationId,
    setActiveOrganizationId,
    applyUserAndOrganization,
  } = useAuth()

  const canCreateOrganization =
    user?.organization_memberships?.some(
      (m) => m.role != null && isOwnerRole(m.role)
    ) ?? false

  const [organizationName, setOrganizationName] = useState('')
  const [country, setCountry] = useState('Bénin')
  const [currency, setCurrency] = useState('XOF')
  const [selectedTimezone, setSelectedTimezone] = useState('Africa/Porto-Novo')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setOrganizationName('')
    setCountry('Bénin')
    setCurrency('XOF')
    setSelectedTimezone('Africa/Porto-Novo')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const n = organizationName.trim()
    if (!n) {
      setError('Indiquez le nom de l’entreprise.')
      return
    }
    if (!country.trim()) {
      setError('Veuillez sélectionner un pays.')
      return
    }

    const result = await Swal.fire({
      title: 'Créer l’entreprise ?',
      text: `Voulez-vous vraiment créer l'entreprise "${n}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, créer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    setSubmitting(true)

    Swal.fire({
      title: 'Création en cours...',
      text: 'Veuillez patienter pendant la création de l’entreprise.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const data = await createOrganization({
        name: n,
        country: country.trim(),
        currency,
        timezone: timezoneForApi(selectedTimezone),
      })
      applyUserAndOrganization(data.user, data.organization.id)
      resetForm()

      await Swal.fire({
        title: 'Entreprise créée !',
        text: `L'entreprise "${n}" a été créée avec succès et est désormais l'entreprise active.`,
        icon: 'success',
        confirmButtonColor: '#3B82F6',
      })

      window.location.reload()
    } catch (err) {
      const errMsg = getApiErrorMessage(err)
      setError(errMsg)

      await Swal.fire({
        title: 'Erreur de création',
        text: errMsg,
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSwitchOrganization(orgId: number, orgName: string) {
    const result = await Swal.fire({
      title: 'Changer d’entreprise ?',
      text: `Voulez-vous utiliser "${orgName}" comme entreprise active ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, changer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      reverseButtons: true,
    })

    if (result.isConfirmed) {
      setActiveOrganizationId(orgId)
      Swal.fire({
        title: 'Entreprise activée !',
        text: `Vous êtes maintenant sur l'entreprise "${orgName}".`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      })
    }
  }

  const memberships = user?.organization_memberships ?? []

  return (
    <div className="space-y-6">
      <div className="">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
            <UserRound className="h-3.5 w-3.5" />
            Mon compte
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Profil utilisateur
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vos informations et les entreprises auxquelles vous êtes rattaché.
            Les propriétaires peuvent créer une autre structure depuis cette
            page.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Informations personnelles
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Identité du compte connecté (non modifiable ici pour l’instant).
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nom
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {user?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                E-mail
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-gray-900">
                {user?.email ?? '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-2 text-[#2563EB]">
            <Building2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-gray-900">
              Vos entreprises
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            L’entreprise <strong>active</strong> sert au reste de l’application
            (en-tête, magasins, paramètres).
          </p>
          <ul className="mt-6 space-y-3">
            {memberships.length === 0 ? (
              <li className="text-sm text-gray-500">Aucune entreprise.</li>
            ) : (
              memberships.map((m) => {
                const isActive = m.organization_id === activeOrganizationId
                const e = m.organization
                return (
                  <li
                    key={m.organization_id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {e?.name ?? `Organization #${m.organization_id}`}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {[e?.country, e?.currency].filter(Boolean).join(' · ') ||
                          '—'}
                        {m.role?.name ? ` · ${displayRoleName(m.role.name)}` : ''}
                      </p>
                    </div>
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleSwitchOrganization(
                            m.organization_id,
                            e?.name ?? `Entreprise #${m.organization_id}`
                          )
                        }
                        className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                      >
                        Utiliser cette entreprise
                      </button>
                    ) : null}
                  </li>
                )
              })
            )}
          </ul>
        </section>

        {canCreateOrganization ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Créer une entreprise
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Vous serez propriétaire ; un magasin principal est créé
              automatiquement. Après création, cette entreprise devient le
              contexte actif.
            </p>

            {error && (
              <div
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="ent-nom"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Nom de l’entreprise
                </label>
                <input
                  id="ent-nom"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="Ex. Boutique Soleil"
                  autoComplete="organization"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="ent-pays"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Pays
                </label>
                <CountrySelect
                  id="ent-pays"
                  value={country}
                  onChange={setCountry}
                  allowClear={false}
                  placeholder="Choisir un pays…"
                  className="[&_button]:rounded-lg"
                />
              </div>
              <div>
                <label
                  htmlFor="ent-devise"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Devise
                </label>
                <select
                  id="ent-devise"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                >
                  {CURRENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="ent-timezone"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  Fuseau horaire (optionnel)
                </label>
                <TimeZoneSelect
                  id="ent-timezone"
                  value={selectedTimezone}
                  onChange={setSelectedTimezone}
                  placeholder="Choisir un fuseau…"
                  className="[&_button]:rounded-lg"
                  ariaLabel="Fuseau horaire de l’entreprise"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
                >
                  {submitting ? 'Création…' : 'Créer l’entreprise'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <p className="text-sm text-gray-600">
            Seuls les comptes avec le rôle Propriétaire sur au moins une
            entreprise peuvent en créer une nouvelle.
          </p>
        )}
      </div>
    </div>
  )
}
