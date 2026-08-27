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
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
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

const PRINT_STYLES = `
  @media print {
    /* Force l'impression des couleurs de fond */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Supprimer les ombres et les marges de page */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    /* Masquer la barre d'outils */
    .invoice-toolbar {
      display: none !important;
    }

    /* Retirer les marges et ombres du conteneur */
    .invoice-wrapper {
      box-shadow: none !important;
      margin: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
    }

    /* Éviter les coupures de page au mauvais endroit */
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
  const extraFees = sale.extra_fees ?? 0
  // sale.total = valeur enregistrée en base, fiable. On ne recalcule que si absent (repli,
  // vieilles ventes) — jamais quand le back nous l'a fourni.
  const total = sale.total ?? (subtotal * (1 - (sale.discount_percentage ?? 0) / 100) + extraFees)
  // Le montant de remise affiché est dérivé du total réel, pas recalculé depuis le
  // pourcentage (qui n'a que 2 décimales en base et ferait dériver l'addition).
  const discount = subtotal - total + extraFees
  const invoiceNumber = sale.invoice_number ?? `#${String(sale.id).padStart(4, '0')}`

  const logoUrl = receiptSetting?.printed_receipt_logo
    ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
    : null

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white pb-10">

      {/* Toolbar — masquée à l'impression via la classe CSS */}
      <div className="invoice-toolbar print:hidden sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
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

      {/* Corps de la facture */}
      <div className="invoice-wrapper mx-auto max-w-[900px] bg-white shadow-md print:shadow-none my-8 print:my-0 pb-16">

        {/* Bloc en-tête */}
        <div
          className="invoice-header-block px-10 py-10 mb-12 flex justify-between items-start"
          style={{ backgroundColor: '#F3F6FA' }}
        >
          <div>
            <h1 className="text-3xl font-black text-[#1E293B] mb-6 uppercase tracking-wider">Facture</h1>
            <div className="space-y-3 text-sm font-semibold text-[#64748B]">
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
              className="max-h-24 max-w-[200px] object-contain"
            />
          )}
        </div>

        {/* Bloc parties */}
        <div className="invoice-parties flex justify-between gap-16 mb-12 px-10">
          {/* Entreprise */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-5">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-2">Entreprise</h2>
            </div>
            <div className="space-y-2.5 text-sm text-[#475569]">
              <p className="text-lg font-bold text-[#1E293B] mb-3">{currentOrganization?.name ?? ''}</p>
              {currentOrganization?.tax_id && <p><span className="font-bold text-[#1E293B]">IFU :</span> {currentOrganization.tax_id}</p>}
              {currentOrganization?.company_registration_number && <p><span className="font-bold text-[#1E293B]">RCCM :</span> {currentOrganization.company_registration_number}</p>}
              {currentOrganization?.phone && <p><span className="font-bold text-[#1E293B]">Téléphone :</span> {currentOrganization.phone}</p>}
              {currentOrganization?.address && <p><span className="font-bold text-[#1E293B]">Adresse :</span> {currentOrganization.address}</p>}
              {sale.seller_name && <p><span className="font-bold text-[#1E293B]">Vendeur :</span> {sale.seller_name}</p>}
            </div>
          </div>

          {/* Client */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-5 text-right">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-2">Client</h2>
            </div>
            <div className="space-y-2.5 text-sm text-[#475569] text-right">
              {sale.customer_name ? (
                <>
                  <p className="text-lg font-bold text-[#1E293B] mb-3">{sale.customer_name}</p>
                  {sale.customer_phone && <p><span className="font-bold text-[#1E293B]">Téléphone :</span> {sale.customer_phone}</p>}
                  {sale.customer_email && <p><span className="font-bold text-[#1E293B]">E-mail :</span> {sale.customer_email}</p>}
                  {sale.customer_tax_id && <p><span className="font-bold text-[#1E293B]">NIF :</span> {sale.customer_tax_id}</p>}
                </>
              ) : (
                <p className="italic text-gray-400">Client anonyme</p>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div className="px-10 mb-10">
          <table className="w-full text-base border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#304169', color: 'white' }} className="text-sm">
                <th className="py-4 px-4 text-left font-semibold border-r border-[#4A5D8A] w-1/2">Description</th>
                <th className="py-4 px-4 text-center font-semibold border-r border-[#4A5D8A]">Prix Unitaire TTC</th>
                <th className="py-4 px-4 text-center font-semibold border-r border-[#4A5D8A] w-24">Qté</th>
                <th className="py-4 px-4 text-right font-semibold">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#E2E8F0]">
                  <td className="py-4 px-4 text-[#1E293B] border-r border-[#E2E8F0]">
                    {item.product_name}
                    {item.product_sku && <span className="ml-1.5 text-sm text-gray-500">({item.product_sku})</span>}
                  </td>
                  <td className="py-4 px-4 text-center text-[#475569] border-r border-[#E2E8F0]">{fmtMoney(item.unit_price)}</td>
                  <td className="py-4 px-4 text-center text-[#475569] border-r border-[#E2E8F0]">{item.quantity}</td>
                  <td className="py-4 px-4 text-right font-medium text-[#1E293B]">{fmtMoney(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="invoice-totals px-10 flex justify-end mb-12">
          <div
            className="w-[360px] border border-[#E2E8F0] p-6 space-y-4"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            {discount > 0 && (
              <div className="flex justify-between text-base font-bold text-[#475569]">
                <span>Remise{sale.discount_percentage ? ` (${sale.discount_percentage}%)` : ''}</span>
                <span>-{fmtMoney(discount)}</span>
              </div>
            )}
            {extraFees > 0 && (
              <div className="flex justify-between text-base font-bold text-[#475569]">
                <span>Frais supplémentaires</span>
                <span>+{fmtMoney(extraFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#475569] pb-4 border-b-2 border-[#1E293B]">
              <span className="uppercase">Total</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between font-black text-[#1E293B] text-lg pt-1">
              <span className="uppercase tracking-wide">Net à payer</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Pied de facture */}
        <div className="invoice-footer px-10">
          {(sale.payment_method || sale.cash_register) && (
            <div className="mb-6 flex gap-8 text-sm text-[#475569] border-t border-[#E2E8F0] pt-6">
              {sale.payment_method && (
                <div>
                  <span className="font-bold text-[#1E293B]">Paiement : </span>
                  {sale.payment_method.name}
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
              className="mb-6 border border-[#E2E8F0] px-5 py-4 text-sm text-[#475569] italic"
              style={{ backgroundColor: '#F8FAFC' }}
            >
              {sale.note}
            </div>
          )}

          {sale.code_dgi && (
            <div className="mb-6 flex items-center gap-6 border-t border-[#E2E8F0] pt-6">
              <QRCodeSVG value={sale.code_dgi} size={96} />
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
            <div className="border-t border-[#E2E8F0] pt-6 text-center text-xs text-[#94A3B8] whitespace-pre-line">
              {receiptSetting.footer_text}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}