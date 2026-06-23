import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Clock,
  Monitor,
  Receipt,
  ShoppingCart,
  TriangleAlert,
  //UserCheck,
  Wallet,
  Link,
  ExternalLink,
} from 'lucide-react'
import type { Organization, Store } from '../../types/api'
import type { GeneralSetting } from '../../types/generalSetting'
import { updateOrganization, updateOrganizationWithLogo } from '../../api/organization'
import { fetchGeneralSetting, updateGeneralSetting } from '../../api/generalSettings'
import { fetchStores } from '../../api/stores'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import { CountrySelect } from '../../components/CountrySelect'
import { PhoneInput } from '../../components/PhoneInput'
import { telephoneForApi } from '../../lib/phoneValue'
import { TimeZoneSelect } from '../../components/TimeZoneSelect'
import { timezoneForApi } from '../../lib/timezone'
import Swal from 'sweetalert2'

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-gray-900">
        {value}
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  icon,
  checked,
  disabled,
  onChange,
}: {
  title: string
  description: string
  icon: React.ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm">
      <div className="flex min-w-0 items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#2563EB]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-gray-900">
            {title}
          </div>
          <div className="mt-1 text-sm text-gray-600">{description}</div>
        </div>
      </div>

      <label
        className={`relative inline-flex h-8 w-14 shrink-0 items-center ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
        title={title}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={title}
        />
        <span className="h-8 w-14 rounded-full bg-gray-200 transition peer-checked:bg-[#10B981]" />
        <span className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-6" />
      </label>
    </div>
  )
}

function organizationValue(e: Organization | undefined, key: keyof Organization): string {
  const v = e?.[key]
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

export default function GeneralSettingPage() {
  const { refreshUser, currentOrganization } = useAuth()
  const organization = currentOrganization ?? undefined

  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<keyof GeneralSetting | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GeneralSetting | null>(null)
  const [editingOrganization, setEditingOrganization] = useState(false)
  const [savingOrganization, setSavingOrganization] = useState(false)
  const [organizationDraft, setOrganizationDraft] = useState<Partial<Organization>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  const [stores, setStores] = useState<Store[]>([])
  const [storesLoading, setStoresLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setError(null)
        setLoading(true)
        const generalSetting = await fetchGeneralSetting()
        if (!cancelled) setData(generalSetting)
      } catch {
        if (!cancelled) setError("Impossible de charger les paramètres généraux.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadStores() {
      if (!data?.online_articles || stores.length > 0) return
      try {
        setStoresLoading(true)
        const res = await fetchStores(1) // Fetch first page of stores
        if (!cancelled) {
          setStores(res.data)
        }
      } catch (e) {
        // Handle silently or show toast
      } finally {
        if (!cancelled) setStoresLoading(false)
      }
    }
    void loadStores()
    return () => {
      cancelled = true
    }
  }, [data?.online_articles])

  useEffect(() => {
    if (!organization) return
    setOrganizationDraft({
      name: organization.name,
      legal_name: organization.legal_name,
      tax_id: organization.tax_id,
      company_registration_number: organization.company_registration_number,
      address: organization.address,
      phone: organization.phone,
      country: organization.country,
      currency: organization.currency,
      timezone: organization.timezone,
    })
    setLogoFile(null)
  }, [organization])

  function normalizeTaxId(v: string): string {
    return v.replace(/\D/g, '').slice(0, 13)
  }

  function isValidTaxId(v: unknown): boolean {
    const s = String(v ?? '').trim()
    return /^\d{13}$/.test(s)
  }

  const features = useMemo(() => {
    if (!data) return []
    return [
      {
        key: 'work_periods' as const,
        title: 'Périodes de travail',
        description:
          'Suivre les espèces qui entrent et sortent de votre tiroir.',
        icon: <Clock className="h-5 w-5" />,
        checked: data.work_periods,
      },
      /*
      {
        key: 'time_tracking' as const,
        title: 'Pointage',
        description: "Nombre total d'heures de travail.",
        icon: <UserCheck className="h-5 w-5" />,
        checked: data.time_tracking,
      },
      */
      {
        key: 'open_tickets' as const,
        title: 'Bon de commande POS',
        description:
          'Autoriser à enregistrer et modifier les commandes avant paiement.',
        icon: <Receipt className="h-5 w-5" />,
        checked: data.open_tickets,
      },
      {
        key: 'kitchen_printers' as const,
        title: 'Imprimantes cuisine',
        description:
          "Envoyer des commandes à l'imprimante cuisine ou à son affichage.",
        icon: <Receipt className="h-5 w-5" />,
        checked: data.kitchen_printers,
      },
      {
        key: 'customer_display' as const,
        title: 'Affichage client',
        description:
          "Afficher les informations de commande clients au moment de l'achat.",
        icon: <Monitor className="h-5 w-5" />,
        checked: data.customer_display,
      },
      {
        key: 'low_stock_notifications' as const,
        title: 'Notification de stock faibles',
        description:
          'Recevoir des mails quotidiens sur les articles faibles ou en rupture de stock.',
        icon: <Bell className="h-5 w-5" />,
        checked: data.low_stock_notifications,
      },
      {
        key: 'negative_stock_alerts' as const,
        title: 'Alertes de stock négatifs',
        description:
          "Avertisser les caissiers qui tentent de vendre plus d’inventaire que ce qui est disponible en stock.",
        icon: <TriangleAlert className="h-5 w-5" />,
        checked: data.negative_stock_alerts,
      },
      {
        key: 'item_buyback' as const,
        title: "Rachats d'articles",
        description:
          "Activer la fonctionnalité de rachat d'articles au sein de l'entreprise.",
        icon: <ShoppingCart className="h-5 w-5" />,
        checked: data.item_buyback,
      },
      /*
      {
        key: 'payment_methods' as const,
        title: 'Moyens de paiement',
        description: "Fonctionnalité de gestion de plusieurs moyens de paiement au sein de l'entreprise.",
        icon: <Wallet className="h-5 w-5" />,
        checked: data.payment_methods,
      },
      */
      {
        key: 'customer_account_payment' as const,
        title: 'Paiement compte client',
        description: "Fonctionnalité permettant aux clients de disposer d'un solde de compte pour effectuer des opérations (dépôt, achat à crédit etc...)",
        icon: <Wallet className="h-5 w-5" />,
        checked: data.customer_account_payment,
      },
      {
        key: 'online_articles' as const,
        title: 'Articles en ligne',
        description:
          "Activer la page publique pour présenter les articles destinés à la vente en ligne.",
        icon: <ShoppingCart className="h-5 w-5" />,
        checked: data.online_articles,
      },
    ]
  }, [data])

  async function onToggle(key: keyof GeneralSetting, next: boolean) {
    if (!data) return
    const prev = data[key] as unknown
    if (typeof prev !== 'boolean') return

    const feature = features.find((f) => f.key === key)
    const featureTitle = feature ? feature.title : key
    const actionText = next ? 'activer' : 'désactiver'

    const result = await Swal.fire({
      title: `${next ? 'Activer' : 'Désactiver'} la fonctionnalité ?`,
      text: `Voulez-vous vraiment ${actionText} la fonctionnalité "${featureTitle}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, confirmer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#EF4444',
      reverseButtons: true,
    })

    if (!result.isConfirmed) return

    setError(null)
    setSavingKey(key)
    setData({ ...data, [key]: next } as GeneralSetting)

    Swal.fire({
      title: 'Enregistrement...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const updated = await updateGeneralSetting({
        [key]: next,
      } as Partial<
        Pick<
          GeneralSetting,
          | 'work_periods'
          | 'time_tracking'
          | 'open_tickets'
          | 'kitchen_printers'
          | 'customer_display'
          | 'low_stock_notifications'
          | 'negative_stock_alerts'
          | 'item_buyback'
          | 'payment_methods'
          | 'customer_account_payment'
          | 'commission'
          | 'online_articles'
        >
      >)
      setData(updated)
      Swal.fire({
        title: 'Paramètre mis à jour !',
        text: `La fonctionnalité "${featureTitle}" a été ${next ? 'activée' : 'désactivée'} avec succès.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      })
    } catch {
      setData({ ...data, [key]: prev } as GeneralSetting)
      setError("Échec de l'enregistrement. Réessayez.")
      Swal.fire({
        title: 'Erreur',
        text: "Échec de l'enregistrement. Veuillez réessayer.",
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configurez votre entreprise et activez les fonctionnalités.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div>
          <div className="self-start rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Informations de l’entreprise
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Données d’identité et paramètres régionaux.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {editingOrganization ? (
                <>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Nom</div>
                    <input
                      aria-label="Nom"
                      title="Nom"
                      value={String(organizationDraft.name ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({
                          ...draft,
                          name: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-xs font-semibold text-gray-500">Logo</div>
                      {logoFile ? (
                        <img
                          src={URL.createObjectURL(logoFile)}
                          alt="Logo entreprise"
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white object-contain"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : organization?.logo ? (
                        <img
                          src={resolveBackendUrl(organization.logo) ?? ''}
                          alt="Logo entreprise"
                          className="h-8 w-8 rounded-lg border border-gray-200 bg-white object-contain"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : null}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Logo"
                      title="Logo"
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">
                      Raison sociale
                    </div>
                    <input
                      aria-label="Raison sociale"
                      title="Raison sociale"
                      value={String(organizationDraft.legal_name ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({
                          ...draft,
                          legal_name: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">IFU</div>
                    <input
                      aria-label="IFU"
                      title="IFU"
                      value={String(organizationDraft.tax_id ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({
                          ...draft,
                          tax_id: normalizeTaxId(e.target.value),
                        }))
                      }
                      inputMode="numeric"
                      pattern="\\d{13}"
                      maxLength={13}
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Adresse</div>
                    <input
                      aria-label="Adresse"
                      title="Adresse"
                      value={String(organizationDraft.address ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({
                          ...draft,
                          address: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">RCCM</div>
                    <input
                      aria-label="RCCM"
                      title="RCCM"
                      value={String(organizationDraft.company_registration_number ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({ ...draft, company_registration_number: e.target.value }))
                      }
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">
                      Téléphone
                    </div>
                    <div className="mt-2">
                      <PhoneInput
                        value={String(organizationDraft.phone ?? '')}
                        onChange={(v) =>
                          setOrganizationDraft((draft) => ({ ...draft, phone: v }))
                        }
                        placeholder="01 97 …"
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Pays</div>
                    <div className="mt-2">
                      <CountrySelect
                        value={String(organizationDraft.country ?? '')}
                        onChange={(v) =>
                          setOrganizationDraft((draft) => ({ ...draft, country: v }))
                        }
                        allowClear={false}
                        placeholder="Choisir un pays…"
                        className="[&_button]:rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Devise</div>
                    <input
                      aria-label="Devise"
                      title="Devise"
                      value={String(organizationDraft.currency ?? '')}
                      onChange={(e) =>
                        setOrganizationDraft((draft) => ({
                          ...draft,
                          currency: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">
                      Fuseau horaire
                    </div>
                    <div className="mt-2">
                      <TimeZoneSelect
                        value={String(organizationDraft.timezone ?? '')}
                        onChange={(v) =>
                          setOrganizationDraft((draft) => ({ ...draft, timezone: v }))
                        }
                        placeholder="Choisir un fuseau…"
                        className="[&_button]:rounded-lg"
                        ariaLabel="Fuseau horaire de l’entreprise"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <FieldRow label="Nom" value={organizationValue(organization, 'name')} />
                  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500">Logo</div>
                    <div className="mt-2 flex items-center gap-3">
                      {organization?.logo ? (
                        <img
                          src={resolveBackendUrl(organization.logo) ?? ''}
                          alt="Logo entreprise"
                          className="h-10 w-10 rounded-lg border border-gray-200 bg-white object-contain"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-400">
                          —
                        </div>
                      )}
                      <div className="min-w-0 truncate text-sm font-medium text-gray-900">
                        {organization?.logo ? 'Logo configuré' : 'Aucun logo'}
                      </div>
                    </div>
                  </div>
                  <FieldRow
                    label="Raison sociale"
                    value={organizationValue(organization, 'legal_name')}
                  />
                  <FieldRow label="IFU" value={organizationValue(organization, 'tax_id')} />
                  <FieldRow
                    label="Adresse"
                    value={organizationValue(organization, 'address')}
                  />
                  <FieldRow label="RCCM" value={organizationValue(organization, 'company_registration_number')} />
                  <FieldRow
                    label="Téléphone"
                    value={organizationValue(organization, 'phone')}
                  />
                  <FieldRow
                    label="Pays"
                    value={organizationValue(organization, 'country')}
                  />
                  <FieldRow
                    label="Devise"
                    value={organizationValue(organization, 'currency')}
                  />
                  <FieldRow
                    label="Fuseau horaire"
                    value={organizationValue(organization, 'timezone')}
                  />
                </>
              )}
            </div>

            {editingOrganization && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  disabled={savingOrganization}
                  onClick={() => {
                    setEditingOrganization(false)
                    setError(null)
                    if (organization) {
                      setOrganizationDraft({
                        name: organization.name,
                        legal_name: organization.legal_name,
                        tax_id: organization.tax_id,
                        company_registration_number: organization.company_registration_number,
                        address: organization.address,
                        phone: organization.phone,
                        country: organization.country,
                        currency: organization.currency,
                        timezone: organization.timezone,
                      })
                    }
                    setLogoFile(null)
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingOrganization}
                  onClick={async () => {
                    if (organizationDraft.tax_id && !isValidTaxId(organizationDraft.tax_id)) {
                      Swal.fire({
                        title: 'IFU invalide',
                        text: 'L’IFU doit contenir exactement 13 chiffres.',
                        icon: 'warning',
                        confirmButtonColor: '#3B82F6',
                      })
                      return
                    }


                    const result = await Swal.fire({
                      title: 'Modifier les informations ?',
                      text: 'Voulez-vous vraiment enregistrer ces informations ?',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonText: 'Oui, enregistrer',
                      cancelButtonText: 'Annuler',
                      confirmButtonColor: '#3B82F6',
                      cancelButtonColor: '#EF4444',
                      reverseButtons: true,
                    })

                    if (!result.isConfirmed) return

                    setSavingOrganization(true)
                    setError(null)

                    Swal.fire({
                      title: 'Enregistrement en cours...',
                      allowOutsideClick: false,
                      didOpen: () => {
                        Swal.showLoading()
                      },
                    })

                    try {
                      const patch = {
                        ...organizationDraft,
                        phone: telephoneForApi(
                          String(organizationDraft.phone ?? '')
                        ),
                        timezone: timezoneForApi(
                          String(organizationDraft.timezone ?? '')
                        ),
                      }
                      if (logoFile) {
                        await updateOrganizationWithLogo(patch, logoFile)
                      } else {
                        await updateOrganization(patch)
                      }
                      await refreshUser()
                      setEditingOrganization(false)
                      Swal.fire({
                        title: 'Enregistré !',
                        text: 'Les informations de l’entreprise ont été mises à jour.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end',
                      })
                    } catch {
                      setError(
                        "Impossible d’enregistrer les informations de l’entreprise."
                      )
                      Swal.fire({
                        title: 'Erreur',
                        text: "Impossible d’enregistrer les informations de l’entreprise.",
                        icon: 'error',
                        confirmButtonColor: '#3B82F6',
                      })
                    } finally {
                      setSavingOrganization(false)
                    }
                  }}
                  className="rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enregistrer
                </button>
              </div>
            )}

            {!editingOrganization && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingOrganization(true)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Modifier
                </button>
              </div>
            )}
          </div>
          {data?.online_articles && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mt-6">
              <div className="mb-4 flex items-center gap-2">
                <Link className="h-5 w-5 text-[#3B82F6]" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Liens publics des magasins
                </h2>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Copiez ou cliquez sur les liens ci-dessous pour accéder à la page des articles en ligne de chaque magasin.
              </p>
              
              {storesLoading ? (
                <div className="text-sm text-gray-500">Chargement des magasins...</div>
              ) : stores.length === 0 ? (
                <div className="text-sm text-gray-500">Aucun magasin disponible.</div>
              ) : (
                <div className="space-y-3">
                  {stores.map(store => {
                    const url = `${window.location.origin}/${organization?.slug || ''}/${store.slug || ''}`
                    return (
                      <div key={store.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div>
                          <div className="font-medium text-gray-900">{store.name}</div>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-[#3B82F6] hover:underline">
                            {url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url)
                          }}
                          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                        >
                          Copier le lien
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Fonctionnalités Générales de l’Entreprise
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Activez ou désactivez les modules disponibles.
            </p>
          </div>

          {loading || !data ? (
            <div className="rounded-xl border border-gray-100 bg-[#EFF6FF] px-4 py-6 text-sm text-gray-600">
              Chargement…
            </div>
          ) : (
            <div className="space-y-3">
              {features.map((feature) => (
                <ToggleRow
                  key={feature.key}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  checked={feature.checked}
                  disabled={savingKey === feature.key}
                  onChange={(next) => onToggle(feature.key, next)}
                />
              ))}
            </div>
          )}
        </div>
    </div>
  </div>
  )
}

