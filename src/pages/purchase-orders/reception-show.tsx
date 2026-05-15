import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, Loader2, Package } from 'lucide-react'
import { fetchReception } from '../../api/purchaseOrderReceptions'
import { getApiErrorMessage } from '../../lib/apiError'
import { API_BASE_URL } from '../../config/env'
import type { PurchaseOrderReception } from '../../types/api'

function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export default function PurchaseOrderReceptionShow() {
  const { id, receptionId } = useParams<{ id: string; receptionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const orderPrefix = location.pathname.startsWith('/central-orders') ? 'central-orders' : 'purchase-orders'

  const [reception, setReception] = useState<PurchaseOrderReception | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id || !receptionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReception(id, receptionId)
      setReception(data)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id, receptionId])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!reception) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error ?? 'Réception introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] p-8">
      <header className="mb-8 flex items-start gap-4">
        <button
          onClick={() => navigate(`/${orderPrefix}/${reception.purchase_order_id}`)}
          className="mt-0.5 rounded-lg border border-gray-300 p-2 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Réception #{String(reception.id).padStart(4, '0')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {reception.received_at
              ? new Date(reception.received_at).toLocaleDateString('fr-FR')
              : '—'}
            {' · '}
            {reception.items_count} article{reception.items_count !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: info card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Informations</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium text-gray-900">
                  {reception.received_at
                    ? new Date(reception.received_at).toLocaleDateString('fr-FR')
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Articles reçus</dt>
                <dd className="font-medium text-gray-900">{reception.items_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total reçu</dt>
                <dd className="font-medium text-gray-900">
                  {reception.total_received.toLocaleString('fr-FR')}
                </dd>
              </div>
              {reception.note && (
                <div className="border-t border-gray-100 pt-3">
                  <dt className="mb-1 text-gray-500">Note</dt>
                  <dd className="text-gray-700">{reception.note}</dd>
                </div>
              )}
            </dl>
          </div>

          {reception.file_path && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Document joint
              </h2>
              <a
                href={resolveStorageUrl(reception.file_path) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                {reception.file_name ?? 'Télécharger'}
              </a>
            </div>
          )}
        </div>

        {/* Right: order items */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
              <Package className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Articles de la commande</h2>
            </div>

            {(reception.order_items ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
                <Package className="h-8 w-8" />
                <p className="text-sm">Aucun article</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Article</th>
                      <th className="px-4 py-3 text-right">Qté commandée</th>
                      <th className="px-4 py-3 text-right">Qté reçue</th>
                      <th className="px-4 py-3 text-right">P.U.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reception.order_items ?? []).map(item => (
                      <tr
                        key={item.order_item_id}
                        className={`bg-white hover:bg-gray-50/50 ${item.quantity_received == null ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <div className="mt-0.5 flex gap-2">
                            {item.product_sku && (
                              <span className="text-xs text-gray-400">{item.product_sku}</span>
                            )}
                            {item.product_category && (
                              <span className="text-xs text-gray-400">{item.product_category}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.quantity_ordered.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.quantity_received != null ? (
                            <span className="inline-flex items-center justify-end gap-1 font-medium text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {item.quantity_received.toLocaleString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {item.unit_cost.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
