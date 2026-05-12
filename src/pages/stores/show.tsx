import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react'
import { deleteStore, fetchStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Store } from '../../types/api'
import { StoreCreateModal } from './create'

function statusPill(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active')
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  if (s === 'inactive') return 'border border-slate-200 bg-slate-100 text-slate-700'
  return 'border border-gray-200 bg-gray-100 text-gray-700'
}

export default function StoreShow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const m = await fetchStore(id)
      setStore(m)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setStore(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete() {
    if (!store) return
    if (!window.confirm(`Supprimer définitivement « ${store.name} » ?`)) return
    setDeleting(true)
    setError(null)
    try {
      await deleteStore(store.id)
      navigate('/stores', { replace: true })
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

  if (error && !store) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Link
          to="/stores"
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

  if (!store) return null

  return (
    <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-8 lg:px-10 lg:py-10">
      <div className="w-full ">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/stores"
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Magasin
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusPill(
                      store.status
                    )}`}
                  >
                    {store.status}
                  </span>
                </div>
                <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-gray-900">
                  {store.name}
                </h1>
              </div>

              <h2 className="mb-6 text-lg font-semibold text-gray-900">Détails</h2>
              <dl className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                  <dd className="text-base text-gray-900 sm:text-right">
                    {store.address?.trim() ? store.address : '—'}
                  </dd>
                </div>
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                  <dd className="text-base font-medium text-gray-900 sm:text-right">
                    {store.phone?.trim() ? store.phone : '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-6 border-t border-gray-100 pt-6 sm:flex-row sm:items-start sm:justify-end sm:gap-8">
                <div className="flex flex-col gap-2 sm:items-end sm:text-right">
                  <div className="text-sm font-medium text-gray-500">Créé le</div>
                  <div className="text-base text-gray-800">
                    {store.created_at
                      ? new Date(store.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:text-right">
                  <div className="text-sm font-medium text-gray-500">
                    Dernière mise à jour
                  </div>
                  <div className="text-base text-gray-800">
                    {store.updated_at
                      ? new Date(store.updated_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm sm:p-10">
              <div className="mb-6 flex items-center gap-3 text-[#0F2E4A]">
                <MapPin className="h-6 w-6 shrink-0" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Paramètres
                </h2>
              </div>
              <dl className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    Central d'achat
                  </dt>
                  <dd>
                    {store.is_purchasing_center ? (
                      <span className="inline-flex rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-800">
                        Oui
                      </span>
                    ) : (
                      <span className="text-lg text-gray-700">Non</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">
                    Taux de commission
                  </dt>
                  <dd className="text-base font-medium text-gray-900 sm:text-right">
                    {store.commission_rate != null
                      ? `${store.commission_rate} %`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>

      <StoreCreateModal
        open={modalOpen}
        store={store}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
