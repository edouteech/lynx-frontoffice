import { useEffect, useState } from 'react'
import Modal from '../../components/Modal'
import { fetchSales } from '../../api/sales'
import type { Customer, Sale } from '../../types/api'
import { getApiErrorMessage } from '../../lib/apiError'
import { Eye, FileText, User, Mail, Phone, Hash, FileCheck2, StickyNote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CustomerTransactionsModalProps {
  open: boolean
  customer: Customer | null
  onClose: () => void
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-white p-3 shadow-xs">
      <div className="mt-0.5 shrink-0 text-[#2563EB]/80">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</div>
        <div className="mt-0.5 truncate text-sm font-medium text-gray-900">{value || '—'}</div>
      </div>
    </div>
  )
}

export function CustomerTransactionsModal({
  open,
  customer,
  onClose,
}: CustomerTransactionsModalProps) {
  const navigate = useNavigate()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!open || !customer) return
    setPage(1)
    setSales([])
  }, [open, customer?.id])

  useEffect(() => {
    if (!open || !customer) return

    const customerId = customer.id
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchSales({
          page,
          customer_id: customerId,
        })
        if (!cancelled) {
          setSales(res.data)
          setLastPage(res.last_page)
          setTotal(res.total)
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, customer, page])

  if (!open || !customer) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Fiche Client - ${customer.name}`}
      subtitle={`Historique complet et informations de contact`}
      maxWidthClassName="max-w-5xl"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Pane - Customer Info */}
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-slate-50 p-4 md:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200/60 pb-2">
            Profil du client
          </h3>

          <div className="space-y-2">
            <InfoItem icon={User} label="Nom" value={customer.name} />
            <InfoItem icon={Mail} label="Adresse e-mail" value={customer.email ?? ''} />
            <InfoItem icon={Phone} label="Téléphone" value={customer.phone ?? ''} />
            <InfoItem icon={Hash} label="IFU" value={customer.tax_id ?? ''} />
            <InfoItem
              icon={FileCheck2}
              label="Statut AIB"
              value={
                customer.aib ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    Assujetti AIB
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 font-medium">Non assujetti</span>
                )
              }
            />
            {customer.note && (
              <div className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-white p-3 shadow-xs">
                <div className="mt-0.5 shrink-0 text-[#2563EB]/80">
                  <StickyNote className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Note interne</div>
                  <div className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-xs text-gray-600">
                    {customer.note}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Transaction History */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Historique des transactions ({total})
            </h3>
          </div>

          {loading && sales.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">Chargement de l'historique...</div>
          ) : sales.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Aucune vente enregistrée pour ce client.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">N° Vente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Magasin</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Paiement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sales.map((sale) => {
                      // sale.total = valeur enregistrée en base, fiable. On ne la recalcule plus
                      // depuis discount_percentage (arrondi à 2 décimales en base).
                      const totalAmt = sale.total ?? 0
                      const statusInfo = STATUS_LABELS[sale.status] ?? STATUS_LABELS.draft

                      return (
                        <tr key={sale.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold font-mono text-gray-700">
                            #{String(sale.id).padStart(4, '0')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                            {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {sale.store?.name ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {sale.payment_method?.name ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                            {totalAmt.toLocaleString('fr-FR')} CFA
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose()
                                  navigate(`/sales/${sale.id}/edit`)
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Détails"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              {sale.status === 'confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose()
                                    navigate(`/sales/${sale.id}/invoice`)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  title="Facture"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {lastPage > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} sur {lastPage}
                  </span>
                  <button
                    type="button"
                    disabled={page >= lastPage || loading}
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
        >
          Fermer
        </button>
      </div>
    </Modal>
  )
}
