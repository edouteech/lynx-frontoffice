import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileUp, Loader2, Truck, X } from 'lucide-react'
import { fetchPurchaseOrder } from '../../api/purchaseOrders'
import { createReception } from '../../api/purchaseOrderReceptions'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PurchaseOrder } from '../../types/api'
import Can from '../../components/Can'

export default function PurchaseOrderReceive() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const orderPrefix = location.pathname.startsWith('/central-orders') ? 'central-orders' : 'purchase-orders'

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [file, setFile] = useState<File | null>(null)
  const [qtys, setQtys] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPurchaseOrder(id)
      setOrder(data)
      const init: Record<number, string> = {}
      for (const item of data.items ?? []) {
        if (item.remaining_quantity > 0) {
          init[item.id] = String(item.remaining_quantity)
        }
      }
      setQtys(init)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const pending = (order?.items ?? []).filter(i => i.remaining_quantity > 0)

  function setAll() {
    const next: Record<number, string> = {}
    for (const i of pending) next[i.id] = String(i.remaining_quantity)
    setQtys(next)
  }

  async function handleSubmit() {
    if (!order || !id) return
    const entries = pending
      .map(i => ({ item_id: i.id, quantity_received: parseFloat(qtys[i.id] ?? '0') || 0 }))
      .filter(e => e.quantity_received > 0)
    if (entries.length === 0) {
      setError('Veuillez saisir au moins une quantité reçue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      if (note.trim()) fd.append('note', note.trim())
      if (receivedAt) fd.append('received_at', receivedAt)
      if (file) fd.append('file', file)
      entries.forEach((entry, i) => {
        fd.append(`items[${i}][item_id]`, String(entry.item_id))
        fd.append(`items[${i}][quantity_received]`, String(entry.quantity_received))
      })
      await createReception(id, fd)
      navigate(`/${orderPrefix}/${id}`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error ?? 'Commande introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EFF6FF] p-8">
      <header className="mb-8 flex items-start gap-4">
        <button
          onClick={() => navigate(`/${orderPrefix}/${order.id}`)}
          className="mt-0.5 rounded-lg border border-gray-300 p-2 hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Réception — Commande #{String(order.id).padStart(4, '0')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {order.supplier?.name ?? order.purchasing_center?.name ?? '—'} → {order.store?.name ?? '—'}
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form fields */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Informations</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date de réception</label>
              <input
                type="date"
                value={receivedAt}
                onChange={e => setReceivedAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (optionnelle)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Observations, remarques..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Document joint (optionnel)</label>
              {file ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="flex-1 truncate text-sm text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded p-0.5 hover:bg-gray-200"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 hover:bg-gray-50">
                  <FileUp className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Image ou PDF (max 10 Mo)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right: items table */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Articles à réceptionner ({pending.length})
                </h2>
              </div>
              {pending.length > 0 && (
                <button
                  type="button"
                  onClick={setAll}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Tout recevoir
                </button>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
                <Truck className="h-8 w-8" />
                <p className="text-sm">Tous les articles ont déjà été réceptionnés.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Article</th>
                      <th className="px-4 py-3 text-right">Stock commandé</th>
                      <th className="px-4 py-3 text-right">Stock livré</th>
                      <th className="px-4 py-3 text-right">Stock restant</th>
                      <th className="px-4 py-3 text-right">Quantité entrant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map(item => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          {item.product_sku && (
                            <p className="text-xs text-gray-400">{item.product_sku}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.quantity.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-600">
                          {item.received_quantity.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                          {item.remaining_quantity.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={item.remaining_quantity}
                            step="any"
                            value={qtys[item.id] ?? ''}
                            onChange={e =>
                              setQtys(prev => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => navigate(`/${orderPrefix}/${order.id}`)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              {pending.length > 0 && (
                <Can code="admin_panel.orders.ack_or_adjust">
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Truck className="h-4 w-4" />
                    Valider la réception
                  </button>
                </Can>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
