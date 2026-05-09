import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Store as StoreIcon, Trash2 } from 'lucide-react'
import {
  deletePaymentMethod,
  fetchPaymentMethod,
  updatePaymentMethod,
} from '../../api/paymentMethods'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PaymentMethod, Store } from '../../types/api'
import { PaymentMethodCreateModal } from './create'

export default function PaymentMethodShow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [savingStoreId, setSavingStoreId] = useState<number | null>(null)
  const [allowedStoreIds, setAllowedStoreIds] = useState<number[]>([])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const pm = await fetchPaymentMethod(id)
      setPaymentMethod(pm)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setPaymentMethod(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const activeStoreIds = useMemo(() => new Set(allowedStoreIds), [allowedStoreIds])

  const allStoreIds = useMemo(() => stores.map((m) => m.id), [stores])
  const allSelected =
    allStoreIds.length > 0 &&
    allStoreIds.every((mid) => activeStoreIds.has(mid))

  useEffect(() => {
    setAllowedStoreIds((paymentMethod?.stores ?? []).map((m) => m.id))
  }, [paymentMethod?.stores])

  useEffect(() => {
    let cancelled = false
    async function loadAllStores() {
      if (!paymentMethod) return
      setLoadingStores(true)
      try {
        const all: Store[] = []
        let page = 1
        while (true) {
          const res = await fetchStores(page)
          all.push(...(res.data ?? []))
          if (page >= res.last_page) break
          page += 1
        }
        if (!cancelled) setStores(all)
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoadingStores(false)
      }
    }
    void loadAllStores()
    return () => {
      cancelled = true
    }
  }, [paymentMethod])

  async function handleDelete() {
    if (!paymentMethod) return
    if (!window.confirm(`Supprimer définitivement « ${paymentMethod.name} » ?`))
      return
    setDeleting(true)
    setError(null)
    try {
      await deletePaymentMethod(paymentMethod.id)
      navigate('/payment-methods', { replace: true })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <p className="text-lg text-gray-600">Chargement…</p>
      </div>
    )
  }

  if (error && !paymentMethod) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Link
          to="/payment-methods"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div className=" rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      </div>
    )
  }

  if (!paymentMethod) return null
  const allowedStores = paymentMethod.stores ?? []

  return (
    <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-8 lg:px-10 lg:py-10">
      <div className="w-full ">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/payment-methods"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>

          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <aside className="flex flex-col gap-6 lg:col-span-7">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm sm:p-10">
              <div className="mb-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Moyen n°{paymentMethod.id}
                    </span>
                    {paymentMethod.category?.name ? (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {paymentMethod.category.name}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-gray-900">
                    {paymentMethod.name}
                  </h1>
                </div>
              </div>

              <h2 className="mb-6 text-lg font-semibold text-gray-900">
                Détails
              </h2>
              <dl className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                  <dd className="text-base text-gray-900">
                    {paymentMethod.category?.name ?? '—'}
                  </dd>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Numéro</dt>
                  <dd className="text-base text-gray-900">
                    {paymentMethod.account_number ?? '—'}
                  </dd>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Token</dt>
                  <dd className="text-base text-gray-900">
                    {paymentMethod.token ? (
                      <span className="break-all">{paymentMethod.token}</span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="border-t border-gray-100 pt-6">
                  <dt className="mb-2 text-sm font-medium text-gray-500">
                    Dernière mise à jour
                  </dt>
                  <dd className="text-base text-gray-800">
                    {paymentMethod.updated_at
                      ? new Date(paymentMethod.updated_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>

          <section className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm sm:p-10">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-[#0F2E4A]">
                  <StoreIcon className="h-6 w-6 shrink-0" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Magasins autorisés
                  </h2>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={
                      loadingStores || savingStoreId !== null || stores.length === 0
                    }
                    onChange={async (e) => {
                      if (!id) return
                      const next = e.target.checked
                      const nextIds = next ? allStoreIds : []
                      setError(null)
                      setSavingStoreId(-1)
                      setAllowedStoreIds(nextIds)
                      try {
                        const updated = await updatePaymentMethod(id, {
                          store_ids: nextIds,
                        })
                        setPaymentMethod(updated)
                      } catch (err) {
                        setAllowedStoreIds(
                          (paymentMethod?.stores ?? []).map((x) => x.id)
                        )
                        setError(getApiErrorMessage(err))
                      } finally {
                        setSavingStoreId(null)
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  Sélectionner tous
                </label>
              </div>
              {loadingStores ? (
                <p className="text-gray-600">Chargement des magasins…</p>
              ) : stores.length ? (
                <ul className="space-y-3">
                  {stores.map((m) => {
                    const checked = activeStoreIds.has(m.id)
                    const disabled = savingStoreId !== null
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{m.name}</div>
                        </div>

                        <label
                          className={`relative inline-flex h-8 w-14 shrink-0 items-center ${
                            disabled
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer'
                          }`}
                          title={checked ? 'Désactiver' : 'Activer'}
                        >
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={checked}
                            disabled={disabled}
                            onChange={async (e) => {
                              const next = e.target.checked
                              if (!id) return
                              setSavingStoreId(m.id)
                              setError(null)

                              const nextIds = new Set(activeStoreIds)
                              if (next) nextIds.add(m.id)
                              else nextIds.delete(m.id)

                              // Optimiste : UI fluide sans rechargement de liste.
                              setAllowedStoreIds(Array.from(nextIds))

                              try {
                                const updated = await updatePaymentMethod(id, {
                                  store_ids: Array.from(nextIds),
                                })
                                setPaymentMethod(updated)
                              } catch (err) {
                                // rollback
                                setAllowedStoreIds(
                                  (paymentMethod?.stores ?? []).map((x) => x.id)
                                )
                                setError(getApiErrorMessage(err))
                              } finally {
                                setSavingStoreId(null)
                              }
                            }}
                            aria-label={`Activer ${m.name}`}
                          />
                          <span className="h-8 w-14 rounded-full bg-gray-200 transition peer-checked:bg-[#10B981]" />
                          <span className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-6" />
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : allowedStores.length ? (
                <p className="text-gray-600">
                  Aucun magasin à afficher (liste vide).
                </p>
              ) : (
                <p className="text-gray-600">
                  Aucun magasin trouvé pour cette entreprise.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <PaymentMethodCreateModal
        open={modalOpen}
        paymentMethod={paymentMethod}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
