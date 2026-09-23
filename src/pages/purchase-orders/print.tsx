import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { fetchPurchaseOrder } from '../../api/purchaseOrders'
import { fetchReceiptSetting } from '../../api/receiptSetting'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import type { PurchaseOrder } from '../../types/api'
import type { ReceiptSetting } from '../../types/receiptSetting'

function fmtMoney(v: number): string {
  const [intPart] = Math.abs(v).toFixed(0).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (v < 0 ? '-' : '') + grouped + ' FCFA'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumise',
  confirmed: 'Confirmée',
  validated: 'Validée',
  partially_received: 'Partiellement reçue',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const PRINT_STYLES = `
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    .invoice-toolbar {
      display: none !important;
    }
    .invoice-wrapper {
      box-shadow: none !important;
      margin: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }
    .invoice-header-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-parties {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-totals {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-footer {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
`

export default function PurchaseOrderPrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrganization } = useAuth()

  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [receiptSetting, setReceiptSetting] = useState<ReceiptSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = PRINT_STYLES
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPurchaseOrder(id)
      .then(async (ord) => {
        setOrder(ord)
        if (ord.store_id) {
          try {
            const rs = await fetchReceiptSetting(ord.store_id)
            setReceiptSetting(rs)
          } catch {
            /* silent */
          }
        }
      })
      .catch((e) => setError(getApiErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-red-600">{error ?? 'Commande introuvable.'}</p>
      </div>
    )
  }

  const isCentral = order.purchasing_center_id !== null && order.purchasing_center_id !== undefined
  const items = order.items ?? []
  const orderNumber = `#${String(order.id).padStart(4, '0')}`
  const statusLabel = STATUS_LABELS[order.status] ?? order.status

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)
  const discountAmount = subtotal * ((order.discount_percentage ?? 0) / 100)
  const total = subtotal - discountAmount + (order.extra_fees ?? 0)

  const logoUrl = receiptSetting?.printed_receipt_logo
    ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
    : null

  const returnUrl = isCentral ? `/central-orders/${order.id}` : `/purchase-orders/${order.id}`

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white pb-10">
      {/* Toolbar */}
      <div className="invoice-toolbar print:hidden sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(returnUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {isCentral ? 'Commande Centrale' : 'Bon de Commande'} {orderNumber}
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      {/* Corps du document */}
      <div className="invoice-wrapper mx-auto max-w-[900px] bg-white shadow-md print:shadow-none my-8 print:my-0 pb-16">
        {/* Bloc en-tête */}
        <div
          className="invoice-header-block px-10 py-10 mb-10 flex justify-between items-start"
          style={{ backgroundColor: '#F3F6FA' }}
        >
          <div>
            <h1 className="text-3xl font-black text-[#1E293B] mb-4 uppercase tracking-wider">
              {isCentral ? "Commande Centrale d'Achat" : 'Bon de Commande'}
            </h1>
            <div className="space-y-2 text-sm font-semibold text-[#64748B]">
              <p className="uppercase">N° Commande : {orderNumber}</p>
              <p className="uppercase">Date d'émission : {fmtDate(order.order_date ?? order.created_at)}</p>
              {order.expected_date && <p className="uppercase">Date de livraison prévue : {fmtDate(order.expected_date)}</p>}
              <p className="uppercase">Statut : {statusLabel}</p>
            </div>
          </div>
          {logoUrl && (
            <img
              src={logoUrl}
              alt={currentOrganization?.name ?? 'Logo'}
              className="max-h-24 max-w-[200px] object-contain"
            />
          )}
        </div>

        {/* Bloc parties */}
        <div className="invoice-parties flex justify-between gap-12 mb-10 px-10">
          {/* Émetteur / Organisation & Magasin */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-4">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-1">Destinataire (Magasin)</h2>
            </div>
            <div className="space-y-1.5 text-sm text-[#475569]">
              <p className="text-base font-bold text-[#1E293B]">{order.store?.name ?? currentOrganization?.name ?? ''}</p>
              {order.store?.address && <p><span className="font-semibold text-[#1E293B]">Adresse :</span> {order.store.address}</p>}
              {order.store?.phone && <p><span className="font-semibold text-[#1E293B]">Tél :</span> {order.store.phone}</p>}
              {currentOrganization?.tax_id && (
                <p><span className="font-semibold text-[#1E293B]">IFU :</span> {currentOrganization.tax_id}</p>
              )}
            </div>
          </div>

          {/* Fournisseur / Centrale */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-4">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-1">
                {isCentral ? "Centrale d'achat" : 'Fournisseur'}
              </h2>
            </div>
            <div className="space-y-1.5 text-sm text-[#475569]">
              {isCentral ? (
                <>
                  <p className="text-base font-bold text-[#1E293B]">{order.purchasing_center?.name ?? '—'}</p>
                  {order.purchasing_center?.address && (
                    <p><span className="font-semibold text-[#1E293B]">Adresse :</span> {order.purchasing_center.address}</p>
                  )}
                  {order.purchasing_center?.phone && (
                    <p><span className="font-semibold text-[#1E293B]">Tél :</span> {order.purchasing_center.phone}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-[#1E293B]">{order.supplier?.name ?? '—'}</p>
                  {order.supplier?.contact_name && (
                    <p><span className="font-semibold text-[#1E293B]">Contact :</span> {order.supplier.contact_name}</p>
                  )}
                  {order.supplier?.phone && (
                    <p><span className="font-semibold text-[#1E293B]">Tél :</span> {order.supplier.phone}</p>
                  )}
                  {order.supplier?.email && (
                    <p><span className="font-semibold text-[#1E293B]">Email :</span> {order.supplier.email}</p>
                  )}
                  {order.supplier?.address && (
                    <p><span className="font-semibold text-[#1E293B]">Adresse :</span> {order.supplier.address}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div className="px-10 mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#304169', color: 'white' }} className="text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-3 border-r border-[#4A5D8A] w-10">#</th>
                <th className="py-3.5 px-3 border-r border-[#4A5D8A]">Article</th>
                <th className="py-3.5 px-3 text-right border-r border-[#4A5D8A]">Qté Commandée</th>
                <th className="py-3.5 px-3 text-right border-r border-[#4A5D8A]">Qté Reçue</th>
                <th className="py-3.5 px-3 text-right border-r border-[#4A5D8A]">Prix Unitaire</th>
                <th className="py-3.5 px-3 text-right">Montant Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {items.map((item, index) => {
                const lineTotal = item.quantity * item.unit_cost
                return (
                  <tr key={item.id ?? index} className={index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-3 text-gray-500">{index + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#1E293B]">{item.product_name ?? `Produit #${item.product_id}`}</p>
                      {item.product_sku && <p className="text-xs text-gray-500">SKU : {item.product_sku}</p>}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#1E293B]">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      <span className={item.received_quantity > 0 ? 'text-green-600' : 'text-gray-400'}>
                        {item.received_quantity ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700">{fmtMoney(item.unit_cost)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#1E293B]">{fmtMoney(lineTotal)}</td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">Aucun article dans cette commande.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totaux & Notes */}
        <div className="invoice-totals flex justify-between items-start px-10 mb-12 gap-8">
          <div className="flex-1">
            {order.note && (
              <div className="bg-gray-50 border-l-4 border-[#3B82F6] p-4 rounded-r-lg">
                <p className="text-xs font-bold text-[#1E293B] uppercase mb-1">Note / Instructions :</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.note}</p>
              </div>
            )}
          </div>
          <div className="w-80 space-y-2 text-sm">
            <div className="flex justify-between py-1 text-gray-600">
              <span>Sous-total :</span>
              <span className="font-semibold text-[#1E293B]">{fmtMoney(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between py-1 text-amber-600">
                <span>Remise ({order.discount_percentage}%) :</span>
                <span className="font-semibold">-{fmtMoney(discountAmount)}</span>
              </div>
            )}
            {(order.extra_fees ?? 0) > 0 && (
              <div className="flex justify-between py-1 text-gray-600">
                <span>Frais additionnels :</span>
                <span className="font-semibold text-[#1E293B]">+{fmtMoney(order.extra_fees ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-[#1E293B] text-base font-black text-[#1E293B]">
              <span>Net à payer :</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Cadre de signatures */}
        <div className="invoice-footer px-10 pt-6 border-t border-gray-200">
          <div className="flex justify-between gap-12 text-center text-xs text-gray-500">
            <div className="flex-1">
              <p className="font-bold text-[#1E293B] uppercase mb-12">Le Responsable des Achats</p>
              <div className="border-b border-gray-300 mx-6"></div>
              <p className="mt-1 italic">Signature &amp; Date</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1E293B] uppercase mb-12">Le Fournisseur / Émetteur</p>
              <div className="border-b border-gray-300 mx-6"></div>
              <p className="mt-1 italic">Signature &amp; Cachet</p>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1E293B] uppercase mb-12">Le Magasin Réceptionnaire</p>
              <div className="border-b border-gray-300 mx-6"></div>
              <p className="mt-1 italic">Visa de réception</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
