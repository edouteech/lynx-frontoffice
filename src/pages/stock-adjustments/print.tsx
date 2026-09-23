import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { fetchStockAdjustment } from '../../api/stockAdjustments'
import { fetchReceiptSetting } from '../../api/receiptSetting'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import { resolveBackendUrl } from '../../lib/url'
import type { StockAdjustment } from '../../types/api'
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
  applied: 'Appliqué',
  cancelled: 'Annulé',
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

export default function StockAdjustmentPrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrganization } = useAuth()

  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null)
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
    fetchStockAdjustment(id)
      .then(async (adj) => {
        setAdjustment(adj)
        if (adj.store_id) {
          try {
            const rs = await fetchReceiptSetting(adj.store_id)
            setReceiptSetting(rs)
          } catch {
            /* silent — no receipt setting configured */
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

  if (error || !adjustment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8">
        <p className="text-red-600">{error ?? 'Ajustement introuvable.'}</p>
      </div>
    )
  }

  const items = adjustment.items ?? []
  const adjustmentNumber = `#${String(adjustment.id).padStart(4, '0')}`
  const statusLabel = STATUS_LABELS[adjustment.status] ?? adjustment.status

  const totalAdded = items
    .filter((i) => i.quantity_change > 0)
    .reduce((s, i) => s + i.quantity_change, 0)

  const totalRemoved = items
    .filter((i) => i.quantity_change < 0)
    .reduce((s, i) => s + Math.abs(i.quantity_change), 0)

  const total = items.reduce((acc, it) => {
    const price = it.purchase_price && it.purchase_price > 0 ? it.purchase_price : (it.selling_price ?? 0)
    return acc + it.quantity_change * price
  }, 0)

  const logoUrl = receiptSetting?.printed_receipt_logo
    ? resolveBackendUrl(receiptSetting.printed_receipt_logo)
    : null

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white pb-10">
      {/* Toolbar — masquée à l'impression via la classe CSS */}
      <div className="invoice-toolbar print:hidden sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/stock-adjustments/${adjustment.id}/edit`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <span className="text-sm font-semibold text-gray-700">Ajustement {adjustmentNumber}</span>
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
          className="invoice-header-block px-10 py-10 mb-12 flex justify-between items-start"
          style={{ backgroundColor: '#F3F6FA' }}
        >
          <div>
            <h1 className="text-3xl font-black text-[#1E293B] mb-6 uppercase tracking-wider">Ajustement de Stock</h1>
            <div className="space-y-3 text-sm font-semibold text-[#64748B]">
              <p className="uppercase">Date : {fmtDate(adjustment.adjustment_date ?? adjustment.created_at)}</p>
              <p className="uppercase">Ajustement N° : {adjustmentNumber}</p>
              {adjustment.store && <p className="uppercase">Magasin : {adjustment.store.name}</p>}
              {adjustment.user_name && <p className="uppercase">Opérateur : {adjustment.user_name}</p>}
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
        <div className="invoice-parties flex justify-between gap-16 mb-12 px-10">
          {/* Entreprise */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-5">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-2">Entreprise</h2>
            </div>
            <div className="space-y-2.5 text-sm text-[#475569]">
              <p className="text-lg font-bold text-[#1E293B] mb-3">{currentOrganization?.name ?? ''}</p>
              {currentOrganization?.tax_id && (
                <p>
                  <span className="font-bold text-[#1E293B]">IFU :</span> {currentOrganization.tax_id}
                </p>
              )}
              {currentOrganization?.company_registration_number && (
                <p>
                  <span className="font-bold text-[#1E293B]">RCCM :</span>{' '}
                  {currentOrganization.company_registration_number}
                </p>
              )}
              {currentOrganization?.phone && (
                <p>
                  <span className="font-bold text-[#1E293B]">Téléphone :</span> {currentOrganization.phone}
                </p>
              )}
              {currentOrganization?.address && (
                <p>
                  <span className="font-bold text-[#1E293B]">Adresse :</span> {currentOrganization.address}
                </p>
              )}
            </div>
          </div>

          {/* Informations Ajustement */}
          <div className="flex-1">
            <div className="border-b-2 border-[#1E293B] mb-5 text-right">
              <h2 className="text-sm font-black text-[#1E293B] uppercase tracking-widest pb-2">Magasin & Motif</h2>
            </div>
            <div className="space-y-2.5 text-sm text-[#475569] text-right">
              <p className="text-lg font-bold text-[#1E293B] mb-3">{adjustment.store?.name ?? '—'}</p>
              {adjustment.store?.address && (
                <p>
                  <span className="font-bold text-[#1E293B]">Adresse :</span> {adjustment.store.address}
                </p>
              )}
              {adjustment.store?.phone && (
                <p>
                  <span className="font-bold text-[#1E293B]">Téléphone :</span> {adjustment.store.phone}
                </p>
              )}
              {adjustment.note && (
                <p className="italic text-gray-600 mt-2">
                  <span className="font-bold not-italic text-[#1E293B]">Motif :</span> « {adjustment.note} »
                </p>
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
                <th className="py-4 px-4 text-center font-semibold border-r border-[#4A5D8A]">Prix Unitaire</th>
                <th className="py-4 px-4 text-center font-semibold border-r border-[#4A5D8A] w-28">Qté Ajustée</th>
                <th className="py-4 px-4 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isAdd = item.quantity_change > 0
                const price = item.purchase_price && item.purchase_price > 0 ? item.purchase_price : (item.selling_price ?? 0)
                const lineTotal = item.quantity_change * price

                return (
                  <tr key={item.id} className="border-b border-[#E2E8F0]">
                    <td className="py-4 px-4 text-[#1E293B] border-r border-[#E2E8F0]">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-gray-500">
                        {item.product_sku && <span>SKU: {item.product_sku}</span>}
                        {item.product_category && <span>{item.product_sku ? ' · ' : ''}{item.product_category}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-[#475569] border-r border-[#E2E8F0]">
                      {fmtMoney(price)}
                    </td>
                    <td className="py-4 px-4 text-center font-semibold border-r border-[#E2E8F0]">
                      <span className={isAdd ? 'text-emerald-700' : 'text-rose-700'}>
                        {isAdd ? `+${item.quantity_change}` : item.quantity_change}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-[#1E293B]">
                      <span className={lineTotal > 0 ? 'text-emerald-700' : lineTotal < 0 ? 'text-rose-700' : 'text-[#1E293B]'}>
                        {lineTotal > 0 ? `+${fmtMoney(lineTotal)}` : fmtMoney(lineTotal)}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    Aucun article dans cet ajustement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="invoice-totals px-10 flex justify-end mb-12">
          <div
            className="w-[380px] border border-[#E2E8F0] p-6 space-y-4"
            style={{ backgroundColor: '#FAFAFA' }}
          >
            <div className="flex justify-between text-sm font-semibold text-[#475569]">
              <span>Nombre d'articles</span>
              <span>{items.length}</span>
            </div>
            {totalAdded > 0 && (
              <div className="flex justify-between text-sm font-semibold text-emerald-700">
                <span>Total unités ajoutées</span>
                <span>+{totalAdded.toLocaleString('fr-FR')}</span>
              </div>
            )}
            {totalRemoved > 0 && (
              <div className="flex justify-between text-sm font-semibold text-rose-700">
                <span>Total unités retirées</span>
                <span>-{totalRemoved.toLocaleString('fr-FR')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#475569] pb-4 border-b-2 border-[#1E293B]">
              <span className="uppercase">Impact Net</span>
              <span className={total > 0 ? 'text-emerald-700' : total < 0 ? 'text-rose-700' : 'text-[#475569]'}>
                {total > 0 ? `+${fmtMoney(total)}` : fmtMoney(total)}
              </span>
            </div>
            <div className="flex justify-between font-black text-[#1E293B] text-lg pt-1">
              <span className="uppercase tracking-wide">Valeur Totale</span>
              <span className={total > 0 ? 'text-emerald-700' : total < 0 ? 'text-rose-700' : 'text-[#1E293B]'}>
                {total > 0 ? `+${fmtMoney(total)}` : fmtMoney(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Pied de facture */}
        <div className="invoice-footer px-10">
          {adjustment.note && (
            <div
              className="mb-8 border border-[#E2E8F0] px-5 py-4 text-sm text-[#475569] italic"
              style={{ backgroundColor: '#F8FAFC' }}
            >
              <span className="font-bold not-italic text-[#1E293B]">Observation / Motif : </span>
              {adjustment.note}
            </div>
          )}

          {/* ── Signatures ── */}
          <div className="pt-4 mb-10">
            <p className="text-sm font-medium text-[#64748B] mb-16">Signatures</p>
            <div className="grid grid-cols-2 gap-16">
              <div className="border-b border-[#1E293B]" />
              <div className="border-b border-[#1E293B]" />
            </div>
          </div>

          {receiptSetting?.footer_text && (
            <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
              {receiptSetting.footer_text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
