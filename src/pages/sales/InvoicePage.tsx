import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchSale } from '../../api/sales'
import { fetchReceiptSetting } from '../../api/receiptSetting'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import type { Sale } from '../../types/api'
import type { ReceiptSetting } from '../../types/receiptSetting'

function fmtMoney(v: number): string {
  const [intPart] = Math.abs(v).toFixed(0).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (v < 0 ? '-' : '') + grouped + ' XOF'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Date/heure MECeF renvoyée par la DGI, stockée telle quelle ("YYYY-MM-DD HH:mm:ss")
// — reformatée en jj/mm/aaaa hh:mm:ss sans passer par un fuseau horaire local.
function fmtDgiDateTime(d: string | null | undefined): string | null {
  if (!d) return null
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
  if (!m) return d
  const [, y, mo, day, h, mi, s] = m
  return `${day}/${mo}/${y} ${h}:${mi}:${s}`
}

function paymentSummary(sale: Sale): string | null {
  if (sale.payments && sale.payments.length > 1) {
    return sale.payments
      .map(p => `${p.payment_method_name ?? 'Moyen #' + p.payment_method_id} (${fmtMoney(p.amount)})`)
      .join(' + ')
  }
  return sale.payment_method?.name ?? null
}

const PRINT_STYLES = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      width: 210mm !important;
      height: 297mm !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    .invoice-toolbar {
      display: none !important;
    }

    .invoice-page-container {
      background: white !important;
      padding: 0 !important;
      margin: 0 !important;
      min-height: auto !important;
    }

    .invoice-wrapper {
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-width: 210mm !important;
      padding: 0 !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .invoice-header-block,
    .invoice-parties,
    .invoice-totals,
    .invoice-footer,
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const { currentOrganization } = useAuth()

  const [sale, setSale] = useState<Sale | null>(null)
  const [receiptSetting, setReceiptSetting] = useState<ReceiptSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Injection des styles d'impression dans le <head>
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-red-600">{error ?? 'Facture introuvable.'}</p>
      </div>
    )
  }

  const items = sale.items ?? []
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  const extraFees = sale.extra_fees ?? 0
  const total = sale.total ?? (subtotal * (1 - (sale.discount_percentage ?? 0) / 100) + extraFees)
  const discount = subtotal - total + extraFees
  const invoiceNumber = sale.invoice_number ?? `#${String(sale.id).padStart(4, '0')}`

  const logoUrl = receiptSetting?.printed_receipt_logo_data_url
    || (receiptSetting?.printed_receipt_logo
      ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
      : null)

  return (
    <div className="invoice-page-container min-h-screen bg-slate-200/80 pb-10 print:pb-0 print:bg-white flex flex-col items-center">

      {/* Toolbar — collée au haut du navigateur, masquée à l'impression */}
      <div className="invoice-toolbar print:hidden sticky top-0 z-10 w-full flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm mb-8">
        <span className="text-sm font-semibold text-gray-800">{invoiceNumber}</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#2563EB] shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      {/* Vraie feuille A4 physique : 210mm x 297mm */}
      <div
        className="invoice-wrapper w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-2xl border border-gray-300/80 rounded-[2px] flex flex-col text-[#1E293B] print:my-0 print:border-none print:shadow-none"
        style={{ boxSizing: 'border-box' }}
      >

        {/* Bloc en-tête */}
        <div
          className="invoice-header-block px-10 py-9 mb-8 flex justify-between items-start"
          style={{ backgroundColor: '#F3F6FA' }}
        >
          <div>
            <h1 className="text-3xl font-black text-[#1E293B] mb-4 uppercase tracking-wider">Facture</h1>
            <div className="space-y-1.5 text-xs font-bold text-[#64748B]">
              <p className="uppercase">Date : {fmtDate(sale.sale_date ?? sale.created_at)}</p>
              <p className="uppercase">Facture N° : {invoiceNumber}</p>
              {sale.store && (
                <p className="uppercase">Magasin : {sale.store.name}</p>
              )}
            </div>
          </div>
          {logoUrl && (
            <img
              src={logoUrl}
              alt={currentOrganization?.name ?? 'Logo'}
              className="max-h-20 max-w-[160px] object-contain"
            />
          )}
        </div>

        {/* Bloc parties */}
        <div className="invoice-parties flex justify-between gap-12 mb-8 px-10">
          {/* Entreprise */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-3 pb-1">
              <h2 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Entreprise</h2>
            </div>
            <div className="space-y-1.5 text-xs text-[#475569]">
              <p className="text-sm font-bold text-[#1E293B] mb-2">{currentOrganization?.name ?? ''}</p>
              {currentOrganization?.tax_id && (
                <p><span className="font-bold text-[#1E293B]">IFU :</span> {currentOrganization.tax_id}</p>
              )}
              {currentOrganization?.company_registration_number && (
                <p><span className="font-bold text-[#1E293B]">RCCM :</span> {currentOrganization.company_registration_number}</p>
              )}
              {currentOrganization?.phone && (
                <p><span className="font-bold text-[#1E293B]">Téléphone :</span> {currentOrganization.phone}</p>
              )}
              {currentOrganization?.address && (
                <p><span className="font-bold text-[#1E293B]">Adresse :</span> {currentOrganization.address}</p>
              )}
              {(sale.seller_name || sale.cashier_name) && (
                <p><span className="font-bold text-[#1E293B]">Vendeur :</span> {sale.seller_name || sale.cashier_name}</p>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-3 pb-1 text-right">
              <h2 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">Client</h2>
            </div>
            <div className="space-y-1.5 text-xs text-[#475569] text-right">
              {sale.customer_name ? (
                <>
                  <p className="text-sm font-bold text-[#1E293B] mb-2">{sale.customer_name}</p>
                  {sale.customer_phone && <p><span className="font-bold text-[#1E293B]">Téléphone :</span> {sale.customer_phone}</p>}
                  {sale.customer_email && <p><span className="font-bold text-[#1E293B]">E-mail :</span> {sale.customer_email}</p>}
                  {sale.customer_tax_id && <p><span className="font-bold text-[#1E293B]">NIF :</span> {sale.customer_tax_id}</p>}
                </>
              ) : (
                <p className="italic text-[#9CA3AF]">Client anonyme</p>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div className="px-10 mb-8">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#304169', color: 'white' }}>
                <th className="py-3 px-3.5 text-left font-bold border-r border-[#4A5D8A]">Description</th>
                <th className="py-3 px-3.5 text-center font-bold border-r border-[#4A5D8A] w-40">Prix Unitaire TTC</th>
                <th className="py-3 px-3.5 text-center font-bold border-r border-[#4A5D8A] w-16">Qté</th>
                <th className="py-3 px-3.5 text-right font-bold w-40">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#E2E8F0]">
                  <td className="py-3 px-3.5 text-[#1E293B] border-r border-[#E2E8F0]">
                    {item.product_name}
                    {item.product_sku && <span className="ml-1.5 text-[11px] text-[#64748B]">({item.product_sku})</span>}
                  </td>
                  <td className="py-3 px-3.5 text-center text-[#475569] border-r border-[#E2E8F0]">{fmtMoney(item.unit_price)}</td>
                  <td className="py-3 px-3.5 text-center text-[#475569] border-r border-[#E2E8F0]">{item.quantity}</td>
                  <td className="py-3 px-3.5 text-right font-bold text-[#1E293B]">{fmtMoney(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="invoice-totals px-10 flex justify-end mb-8">
          <div
            className="w-[290px] border border-[#E2E8F0] p-4 space-y-2.5"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            {discount > 0 && (
              <div className="flex justify-between text-xs font-bold text-[#475569]">
                <span>Remise{sale.discount_percentage ? ` (${sale.discount_percentage}%)` : ''}</span>
                <span>-{fmtMoney(discount)}</span>
              </div>
            )}
            {extraFees > 0 && (
              <div className="flex justify-between text-xs font-bold text-[#475569]">
                <span>Frais supplémentaires</span>
                <span>+{fmtMoney(extraFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold text-[#475569] pb-2.5 border-b-2 border-[#1E293B]">
              <span className="uppercase">Total</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between font-black text-[#1E293B] text-sm pt-1">
              <span className="uppercase tracking-wider">Net à payer</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de facture calé en bas de la feuille A4 */}
        <div className="invoice-footer px-10 mt-auto pb-10 flex flex-col justify-end">
          {(paymentSummary(sale) || sale.cash_register) && (
            <div className="mb-5 flex gap-8 text-xs text-[#475569]">
              {paymentSummary(sale) && (
                <div>
                  <span className="font-bold text-[#1E293B]">Paiement : </span>
                  {paymentSummary(sale)}
                </div>
              )}
              {sale.cash_register && (
                <div>
                  <span className="font-bold text-[#1E293B]">Caisse : </span>
                  {sale.cash_register.name}
                </div>
              )}
            </div>
          )}

          {sale.note && (
            <div
              className="mb-5 border border-[#E2E8F0] px-4 py-3 text-xs text-[#475569] italic"
              style={{ backgroundColor: '#F8FAFC' }}
            >
              {sale.note}
            </div>
          )}

          {sale.code_dgi && (
            <div className="mb-5 flex items-center gap-5 border-t border-[#E2E8F0] pt-4">
              <QRCodeSVG value={sale.code_dgi} size={72} />
              <div className="space-y-1 text-xs text-[#475569]">
                <p className="font-bold uppercase tracking-wide text-[#1E293B]">Facture normalisée — DGI</p>
                {sale.dgi_mecef_code && <p>Code MECeF/DGI : <span className="font-mono">{sale.dgi_mecef_code}</span></p>}
                {sale.dgi_min && <p>MECeF NIM : <span className="font-mono">{sale.dgi_min}</span></p>}
                {sale.dgi_counters && <p>MECeF Compteurs : <span className="font-mono">{sale.dgi_counters}</span></p>}
                {fmtDgiDateTime(sale.dgi_date) && <p>MECeF Heure : <span className="font-mono">{fmtDgiDateTime(sale.dgi_date)}</span></p>}
              </div>
            </div>
          )}

          {receiptSetting?.footer_text && (
            <div className="border-t border-[#E2E8F0] pt-3 text-center text-xs text-[#94A3B8] whitespace-pre-line mb-3">
              {receiptSetting.footer_text}
            </div>
          )}

          <div className="border-t border-[#E2E8F0] pt-3 text-center text-[10px] text-[#94A3B8]">
            <p>Facture générée par Lynx, solutions de gestion de caisse, facturation et stock.</p>
            <p>Plus de détails sur lynx-solution.com</p>
          </div>
        </div>

      </div>
    </div>
  )
}