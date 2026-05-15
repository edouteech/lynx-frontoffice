import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Printer } from 'lucide-react'
import { fetchSale } from '../../api/sales'
import { fetchReceiptSetting } from '../../api/receiptSetting'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import type { Sale } from '../../types/api'
import type { ReceiptSetting } from '../../types/receiptSetting'

function fmtMoney(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' CFA'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const { currentOrganization } = useAuth()

  const [sale, setSale] = useState<Sale | null>(null)
  const [receiptSetting, setReceiptSetting] = useState<ReceiptSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchSale(id)
      .then(async (s) => {
        setSale(s)
        if (s.store_id) {
          try {
            const rs = await fetchReceiptSetting(s.store_id)
            setReceiptSetting(rs)
          } catch { /* silent — no receipt setting configured */ }
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

  if (error || !sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-red-600">{error ?? 'Facture introuvable.'}</p>
      </div>
    )
  }

  const items = sale.items ?? []
  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0)
  const discount = sale.discount_percentage ? subtotal * (sale.discount_percentage / 100) : 0
  const extraFees = sale.extra_fees ?? 0
  const total = subtotal - discount + extraFees
  const invoiceNumber = `FAC-${String(sale.id).padStart(6, '0')}`

  const logoUrl = receiptSetting?.printed_receipt_logo
    ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
    : currentOrganization?.logo
      ? resolveBackendUrl(currentOrganization.logo)
      : null

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <span className="text-sm font-semibold text-gray-700">{invoiceNumber}</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      {/* Invoice body */}
      <div className="mx-auto max-w-2xl bg-white p-10 shadow-md print:shadow-none print:p-8 my-6 print:my-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={currentOrganization?.name ?? 'Logo'}
                className="max-h-16 max-w-[160px] object-contain mb-2"
              />
            ) : (
              <p className="text-xl font-bold text-gray-900 mb-1">{currentOrganization?.name ?? ''}</p>
            )}
            {currentOrganization?.address && (
              <p className="text-xs text-gray-500">{currentOrganization.address}</p>
            )}
            {currentOrganization?.phone && (
              <p className="text-xs text-gray-500">{currentOrganization.phone}</p>
            )}
            {receiptSetting?.header_text && (
              <p className="mt-1 text-xs text-gray-500 whitespace-pre-line">{receiptSetting.header_text}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">FACTURE</p>
            <p className="text-sm text-gray-500 mt-1">{invoiceNumber}</p>
            <p className="text-sm text-gray-500">Date : {fmtDate(sale.sale_date ?? sale.created_at)}</p>
            {sale.store && (
              <p className="text-xs text-gray-400 mt-1">{sale.store.name}</p>
            )}
          </div>
        </div>

        {/* Customer block */}
        {sale.customer_name && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Client</p>
            <p className="font-semibold text-gray-900">{sale.customer_name}</p>
            {sale.customer_phone && (
              <p className="text-sm text-gray-600">{sale.customer_phone}</p>
            )}
            {sale.customer_email && (
              <p className="text-sm text-gray-600">{sale.customer_email}</p>
            )}
            {sale.customer_tax_id && (
              <p className="text-xs text-gray-500">NIF : {sale.customer_tax_id}</p>
            )}
          </div>
        )}

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-2 text-left font-semibold text-gray-900">Article</th>
              <th className="py-2 text-right font-semibold text-gray-900 w-16">Qté</th>
              <th className="py-2 text-right font-semibold text-gray-900 w-28">Prix unit.</th>
              <th className="py-2 text-right font-semibold text-gray-900 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">
                  {item.product_name}
                  {item.product_sku && (
                    <span className="ml-1 text-xs text-gray-400">({item.product_sku})</span>
                  )}
                </td>
                <td className="py-2 text-right text-gray-700">{item.quantity}</td>
                <td className="py-2 text-right text-gray-700">{fmtMoney(item.unit_price)}</td>
                <td className="py-2 text-right font-medium text-gray-900">{fmtMoney(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Remise ({sale.discount_percentage}%)</span>
                <span>-{fmtMoney(discount)}</span>
              </div>
            )}
            {extraFees > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Frais supplémentaires</span>
                <span>+{fmtMoney(extraFees)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-900 pt-2 font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        {(sale.payment_method || sale.cash_register) && (
          <div className="mb-6 flex gap-6 text-sm text-gray-600">
            {sale.payment_method && (
              <div>
                <span className="font-medium text-gray-700">Paiement : </span>
                {sale.payment_method.name}
              </div>
            )}
            {sale.cash_register && (
              <div>
                <span className="font-medium text-gray-700">Caisse : </span>
                {sale.cash_register.name}
              </div>
            )}
          </div>
        )}

        {/* Note */}
        {sale.note && (
          <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 italic">
            {sale.note}
          </div>
        )}

        {/* Footer */}
        {receiptSetting?.footer_text && (
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400 whitespace-pre-line">
            {receiptSetting.footer_text}
          </div>
        )}
      </div>
    </div>
  )
}
