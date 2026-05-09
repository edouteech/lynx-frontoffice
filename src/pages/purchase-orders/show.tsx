import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Edit, Loader2, Package,
  Printer, ShieldCheck, Truck, X,
} from 'lucide-react'
import {
  fetchPurchaseOrder,
  markPurchaseOrderCompleted,
  receivePurchaseOrder,
  confirmPurchaseOrder,
  validatePurchaseOrder,
} from '../../api/purchaseOrders'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PurchaseOrder, PurchaseOrderItem } from '../../types/api'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; className: string }> = {
  submitted:          { label: 'Soumise',               className: 'bg-purple-100 text-purple-700' },
  confirmed:          { label: 'Confirmée (centrale)',   className: 'bg-indigo-100 text-indigo-700' },
  validated:          { label: 'Validée',               className: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partiellement reçue',   className: 'bg-amber-100 text-amber-700' },
  completed:          { label: 'Terminée',              className: 'bg-green-100 text-green-700' },
}

// ── Receive modal ─────────────────────────────────────────────────────────────

interface ReceiveModalProps {
  items: PurchaseOrderItem[]
  onClose: () => void
  onSubmit: (entries: { item_id: number; quantity_received: number }[]) => Promise<void>
  receiving: boolean
}

function ReceiveModal({ items, onClose, onSubmit, receiving }: ReceiveModalProps) {
  const pending = items.filter(i => i.remaining_quantity > 0)
  const [qtys, setQtys] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    for (const i of pending) init[i.id] = String(i.remaining_quantity)
    return init
  })

  function setAll() {
    const next: Record<number, string> = {}
    for (const i of pending) next[i.id] = String(i.remaining_quantity)
    setQtys(next)
  }

  async function handleSubmit() {
    const entries = pending
      .map(i => ({ item_id: i.id, quantity_received: parseFloat(qtys[i.id] ?? '0') || 0 }))
      .filter(e => e.quantity_received > 0)
    if (entries.length === 0) return
    await onSubmit(entries)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Réception de marchandises</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          {pending.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">
              Tous les articles ont déjà été réceptionnés.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">Saisissez les quantités reçues :</p>
                <button type="button" onClick={setAll} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                  Tout recevoir
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Article</th>
                      <th className="px-4 py-3 text-right">Commandé</th>
                      <th className="px-4 py-3 text-right">Reçu</th>
                      <th className="px-4 py-3 text-right">Restant</th>
                      <th className="px-4 py-3 text-right">À recevoir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map(item => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          {item.product_sku && <p className="text-xs text-gray-400">{item.product_sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-600">{item.received_quantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600">{item.remaining_quantity}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number" min={0} max={item.remaining_quantity} step="any"
                            value={qtys[item.id] ?? ''}
                            onChange={e => setQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          {pending.length > 0 && (
            <button type="button" onClick={() => void handleSubmit()} disabled={receiving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {receiving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Truck className="h-4 w-4" />
              Valider la réception
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PurchaseOrderShow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReceive, setShowReceive] = useState(false)
  const [receiving, setReceiving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [validating, setValidating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPurchaseOrder(id)
      setOrder(data)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function handleReceive(entries: { item_id: number; quantity_received: number }[]) {
    if (!order) return
    setReceiving(true)
    try {
      const updated = await receivePurchaseOrder(order.id, entries)
      setOrder(updated)
      setShowReceive(false)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setReceiving(false)
    }
  }

  async function handleConfirm() {
    if (!order) return
    if (!window.confirm('Confirmer cette commande centrale ?')) return
    setConfirming(true)
    try {
      const updated = await confirmPurchaseOrder(order.id)
      setOrder(prev => prev ? { ...prev, status: updated.status } : null)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setConfirming(false)
    }
  }

  async function handleValidate() {
    if (!order) return
    if (!window.confirm('Passer et valider cette commande ? Le magasin pourra ensuite réceptionner les produits.')) return
    setValidating(true)
    try {
      const updated = await validatePurchaseOrder(order.id)
      setOrder(prev => prev ? { ...prev, status: updated.status } : null)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setValidating(false)
    }
  }

  async function handleMarkCompleted() {
    if (!order) return
    if (!window.confirm('Marquer cette commande comme terminée ?')) return
    setCompleting(true)
    try {
      const updated = await markPurchaseOrderCompleted(order.id)
      setOrder(prev => prev ? { ...prev, status: updated.status } : null)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setCompleting(false)
    }
  }

  // Financial computations
  const subtotal = (order?.items ?? []).reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0)
  const discountAmount = subtotal * ((order?.discount_percentage ?? 0) / 100)
  const total = subtotal - discountAmount + (order?.extra_fees ?? 0)

  const isCentral = order?.purchasing_center_id !== null && order?.purchasing_center_id !== undefined

  const canEdit = order && order.status !== 'completed' &&
    !(isCentral && (order.status === 'validated' || order.status === 'partially_received'))

  const canReceive = order &&
    (order.status === 'validated' || order.status === 'partially_received') &&
    (order.items ?? []).some(i => i.remaining_quantity > 0)

  const canConfirm  = order && isCentral && order.status === 'submitted'
  const canValidate = order && isCentral && order.status === 'confirmed'
  const canMarkComplete = order && order.status === 'partially_received'

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-[#EFF6FF] p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      </div>
    )
  }

  if (!order) return null

  const statusCfg = STATUS[order.status] ?? STATUS.validated

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#EFF6FF] p-8 print:ml-0 print:p-6" id="print-area" ref={printRef}>
        {/* Header */}
        <header className="no-print mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(isCentral ? '/central-orders' : '/purchase-orders')}
              className="rounded-lg border border-gray-300 p-2 hover:bg-white">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Commande #{String(order.id).padStart(4, '0')}
                </h1>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
                {isCentral && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Centrale d'achat
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {isCentral
                  ? `${order.purchasing_center?.name ?? '—'} → ${order.store?.name ?? '—'}`
                  : `${order.supplier?.name ?? '—'} — ${order.store?.name ?? '—'}`
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Printer className="h-4 w-4" />
              Imprimer
            </button>

            {canEdit && (
              <button onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Edit className="h-4 w-4" />
                Modifier
              </button>
            )}

            {/* Actions centrales d'achat */}
            {canConfirm && (
              <button onClick={() => void handleConfirm()} disabled={confirming}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Confirmer
              </button>
            )}

            {canValidate && (
              <button onClick={() => void handleValidate()} disabled={validating}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Passer &amp; valider
              </button>
            )}

            {/* Réceptionner — uniquement quand validée */}
            {canReceive && (
              <button onClick={() => setShowReceive(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                <Truck className="h-4 w-4" />
                Réceptionner
              </button>
            )}

            {canMarkComplete && (
              <button onClick={() => void handleMarkCompleted()} disabled={completing}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Marquer terminée
              </button>
            )}
          </div>
        </header>

        {/* Print title */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">Bon de commande #{String(order.id).padStart(4, '0')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Statut : {statusCfg.label} &mdash;{' '}
            {isCentral
              ? `Centrale : ${order.purchasing_center?.name}`
              : `Fournisseur : ${order.supplier?.name}`
            }{' '}
            &mdash; Magasin : {order.store?.name}
          </p>
        </div>

        {error && (
          <div className="no-print mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: order info */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Informations</h2>
              <dl className="space-y-3 text-sm">
                {isCentral ? (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Centrale d'achat</dt>
                    <dd className="font-medium text-gray-900">{order.purchasing_center?.name ?? '—'}</dd>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Fournisseur</dt>
                    <dd className="font-medium text-gray-900">{order.supplier?.name ?? '—'}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Magasin dest.</dt>
                  <dd className="font-medium text-gray-900">{order.store?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date commande</dt>
                  <dd className="font-medium text-gray-900">
                    {order.order_date ? new Date(order.order_date).toLocaleDateString('fr-FR') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date prévue</dt>
                  <dd className="font-medium text-gray-900">
                    {order.expected_date ? new Date(order.expected_date).toLocaleDateString('fr-FR') : '—'}
                  </dd>
                </div>
                {order.note && (
                  <div className="border-t border-gray-100 pt-3">
                    <dt className="mb-1 text-gray-500">Note</dt>
                    <dd className="text-gray-700">{order.note}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Workflow centrale */}
            {isCentral && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Workflow</h2>
                <ol className="space-y-2 text-sm">
                  {[
                    { key: 'submitted',          label: 'Soumise' },
                    { key: 'confirmed',           label: 'Confirmée (centrale)' },
                    { key: 'validated',           label: 'Validée (passée)' },
                    { key: 'partially_received',  label: 'En réception' },
                    { key: 'completed',           label: 'Terminée' },
                  ].map((step, i) => {
                    const statuses = ['submitted', 'confirmed', 'validated', 'partially_received', 'completed']
                    const currentIdx = statuses.indexOf(order.status)
                    const stepIdx = statuses.indexOf(step.key)
                    const done    = stepIdx < currentIdx
                    const active  = stepIdx === currentIdx

                    return (
                      <li key={step.key} className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
                          ${done   ? 'bg-green-500 text-white'
                          : active ? 'bg-indigo-600 text-white'
                          :          'bg-gray-100 text-gray-400'}`}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        <span className={active ? 'font-semibold text-gray-900' : done ? 'text-gray-500' : 'text-gray-400'}>
                          {step.label}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}

            {/* Financial summary */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Résumé financier</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sous-total</dt>
                  <dd className="tabular-nums">{subtotal.toLocaleString('fr-FR')} CFA</dd>
                </div>
                {(order.discount_percentage ?? 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <dt>Remise ({order.discount_percentage}%)</dt>
                    <dd className="tabular-nums">−{discountAmount.toLocaleString('fr-FR')} CFA</dd>
                  </div>
                )}
                {(order.extra_fees ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Frais supplémentaires</dt>
                    <dd className="tabular-nums">{Number(order.extra_fees).toLocaleString('fr-FR')} CFA</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{total.toLocaleString('fr-FR')} CFA</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right: items table */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
                <Package className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Articles ({(order.items ?? []).length})
                </h2>
              </div>

              {(order.items ?? []).length === 0 ? (
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
                        <th className="px-4 py-3 text-right">Qté cmd.</th>
                        <th className="px-4 py-3 text-right">Reçu</th>
                        <th className="px-4 py-3 text-right">Restant</th>
                        <th className="px-4 py-3 text-right">P.U.</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(order.items ?? []).map(item => {
                        const isFullyReceived = item.remaining_quantity <= 0
                        return (
                          <tr key={item.id} className="bg-white hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.product_name}</p>
                              <div className="flex gap-2 mt-0.5">
                                {item.product_sku && <span className="text-xs text-gray-400">{item.product_sku}</span>}
                                {item.product_category && <span className="text-xs text-gray-400">{item.product_category}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className={item.received_quantity > 0 ? 'font-medium text-green-600' : 'text-gray-400'}>
                                {item.received_quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {isFullyReceived ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Complet
                                </span>
                              ) : (
                                <span className="font-medium text-amber-600">{item.remaining_quantity}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {item.unit_cost.toLocaleString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                              {item.total.toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReceive && order.items && (
        <ReceiveModal
          items={order.items}
          onClose={() => setShowReceive(false)}
          onSubmit={handleReceive}
          receiving={receiving}
        />
      )}
    </>
  )
}
