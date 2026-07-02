import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Hash,
  FileCheck2,
  StickyNote,
  Eye,
  FileText,
  Pencil,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import { fetchCustomers, fetchCustomerTransactions } from '../../api/customer'
import { fetchSales } from '../../api/sales'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Customer, Sale, CustomerTransaction } from '../../types/api'
import { CustomerCreateModal } from './create'
import { DateRangePicker } from '../../components/DateRangePicker'
import { CustomerTransactionModal } from './transaction-modal'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   className: 'bg-red-100 text-red-600' },
}

function InfoRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className="mt-0.5 shrink-0 rounded-md bg-blue-50 p-1.5 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  )
}

export default function CustomerShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerLoading, setCustomerLoading] = useState(true)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Transactions state
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)
  const [transPage, setTransPage] = useState(1)
  const [transLastPage, setTransLastPage] = useState(1)
  const [transTotal, setTransTotal] = useState(0)

  const [activeTab, setActiveTab] = useState<'sales' | 'transactions'>('sales')

  // Date range filter — default to current month (sales)
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00`
  })
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}T23:59`
  })

  // Date range filter for transactions tab — default to current month
  const [transDateFrom, setTransDateFrom] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01T00:00`
  })
  const [transDateTo, setTransDateTo] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}T23:59`
  })

  const [editOpen, setEditOpen] = useState(false)
  const [transModalOpen, setTransModalOpen] = useState(false)
  const [transType, setTransType] = useState<'deposit' | 'withdrawal'>('deposit')

  // Load customer info
  const loadCustomer = useCallback(() => {
    if (!id) return
    setCustomerLoading(true)
    fetchCustomers(1, undefined, false)
      .then((res) => {
        const found = res.data.find((c) => String(c.id) === String(id))
        if (found) {
          setCustomer(found)
        } else {
          setCustomerError('Client introuvable.')
        }
      })
      .catch((e) => setCustomerError(getApiErrorMessage(e)))
      .finally(() => setCustomerLoading(false))
  }, [id])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  // Load sales
  useEffect(() => {
    if (!id || activeTab !== 'sales') return
    setSalesLoading(true)
    setSalesError(null)
    const from = dateFrom.slice(0, 10)
    const to = dateTo.slice(0, 10)
    fetchSales({ page, customer_id: Number(id), from, to })
      .then((res) => {
        setSales(res.data)
        setLastPage(res.last_page)
        setTotal(res.total)
      })
      .catch((e) => setSalesError(getApiErrorMessage(e)))
      .finally(() => setSalesLoading(false))
  }, [id, page, dateFrom, dateTo, activeTab])

  // Load transactions
  const loadTransactions = useCallback(() => {
    if (!id) return
    setTransactionsLoading(true)
    setTransactionsError(null)
    const from = transDateFrom.slice(0, 10)
    const to = transDateTo.slice(0, 10)
    fetchCustomerTransactions(id, transPage, from, to)
      .then((res) => {
        setTransactions(res.data)
        setTransLastPage(res.last_page)
        setTransTotal(res.total)
      })
      .catch((e) => setTransactionsError(getApiErrorMessage(e)))
      .finally(() => setTransactionsLoading(false))
  }, [id, transPage, transDateFrom, transDateTo])

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions()
    }
  }, [activeTab, loadTransactions])

  // Compute total amount of visible sales
  const totalAmount = useMemo(() => {
    return sales.reduce((sum, sale) => {
      const sub = (sale as Sale & { subtotal?: number }).subtotal ?? 0
      const disc = sub * ((sale.discount_percentage ?? 0) / 100)
      return sum + (sub - disc + (sale.extra_fees ?? 0))
    }, 0)
  }, [sales])

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-xs hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            {customerLoading ? 'Chargement...' : (customer?.name ?? 'Client')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Fiche client & gestion du compte</p>
        </div>
        {customer && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
        )}
      </header>

      {customerError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {customerError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── LEFT — Customer profile ── */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            {customerLoading ? (
              <p className="py-6 text-center text-sm text-gray-400">Chargement...</p>
            ) : customer ? (
              <div>
                <InfoRow icon={User} label="Nom complet">
                  {customer.name}
                </InfoRow>
                <InfoRow icon={Mail} label="Adresse e-mail">
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </InfoRow>
                <InfoRow icon={Phone} label="Téléphone">
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </InfoRow>
                <InfoRow icon={Hash} label="Numéro IFU">
                  {customer.tax_id ?? <span className="text-gray-400">—</span>}
                </InfoRow>
                <InfoRow icon={Hash} label="Réduction">
                  {customer.discount_percentage ? `${customer.discount_percentage}%` : <span className="text-gray-400">—</span>}
                </InfoRow>  
                <InfoRow icon={FileCheck2} label="Statut AIB">
                  {customer.aib ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      Oui
                    </span>
                  ) : (
                    <span className="text-gray-500">Non</span>
                  )}
                </InfoRow>
                {customer.note && (
                  <InfoRow icon={StickyNote} label="Note interne">
                    <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-gray-600">
                      {customer.note}
                    </p>
                  </InfoRow>
                )}
              </div>
            ) : null}
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Solde du compte</p>
              <p className={`mt-1 text-2xl font-bold ${customer?.account_balance && customer.account_balance > 0 ? 'text-emerald-600' : customer?.account_balance && customer.account_balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {customer?.account_balance?.toLocaleString('fr-FR') ?? 0} CFA
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTransType('deposit'); setTransModalOpen(true) }}
                  className="inline-flex justify-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Dépôt
                </button>
                <button
                  type="button"
                  onClick={() => { setTransType('withdrawal'); setTransModalOpen(true) }}
                  className="inline-flex justify-center rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  Retrait
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Transactions de Vente</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{total}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Total Acheté (visible)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{totalAmount.toLocaleString('fr-FR')} CFA</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Tabs & Content ── */}
        <div className="lg:col-span-2">
          
          <div className="mb-4 flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'sales'
                  ? 'border-[#3B82F6] text-[#3B82F6]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Historique des ventes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-[#3B82F6] text-[#3B82F6]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Historique du compte
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
            {activeTab === 'sales' ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">Historique des ventes</h2>
                    <p className="text-xs text-gray-400">{total} vente(s) — {totalAmount.toLocaleString('fr-FR')} CFA au total</p>
                  </div>
                  <DateRangePicker
                    from={dateFrom}
                    to={dateTo}
                    onRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }}
                  />
                </div>

                {salesError && (
                  <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {salesError}
                  </div>
                )}

                {salesLoading && sales.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">Chargement de l'historique...</div>
                ) : sales.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Aucune vente enregistrée pour ce client.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">N° Vente</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Magasin</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {sales.map((sale) => {
                            const sub = (sale as Sale & { subtotal?: number }).subtotal ?? 0
                            const disc = sub * ((sale.discount_percentage ?? 0) / 100)
                            const totalAmt = sub - disc + (sale.extra_fees ?? 0)
                            const statusInfo = STATUS_LABELS[sale.status] ?? STATUS_LABELS.draft

                            return (
                              <tr key={sale.id} className="transition-colors hover:bg-blue-50/30">
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <span className="font-mono text-sm font-semibold text-gray-700">
                                    #{String(sale.id).padStart(4, '0')}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                  {sale.sale_date
                                    ? new Date(sale.sale_date).toLocaleDateString('fr-FR')
                                    : '—'}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">
                                  {sale.store?.name ?? '—'}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}>
                                    {statusInfo.label}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold text-gray-900">
                                  {totalAmt.toLocaleString('fr-FR')} CFA
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/sales/${sale.id}/edit`)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-600 shadow-xs hover:bg-blue-50 transition-colors"
                                      title="Voir les détails"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      Détails
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {lastPage > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                        <button
                          type="button"
                          disabled={page <= 1 || salesLoading}
                          onClick={() => setPage((p) => p - 1)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ← Précédent
                        </button>
                        <span className="text-sm text-gray-500">
                          Page {page} / {lastPage}
                        </span>
                        <button
                          type="button"
                          disabled={page >= lastPage || salesLoading}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Suivant →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">Historique du compte</h2>
                    <p className="text-xs text-gray-400">{transTotal} mouvement(s)</p>
                  </div>
                  <DateRangePicker
                    from={transDateFrom}
                    to={transDateTo}
                    onRangeChange={(f, t) => { setTransDateFrom(f); setTransDateTo(t); setTransPage(1) }}
                  />
                </div>

                {transactionsError && (
                  <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {transactionsError}
                  </div>
                )}

                {transactionsLoading && transactions.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">Chargement des opérations...</div>
                ) : transactions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Aucune transaction enregistrée sur ce compte.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Montant</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Solde (après)</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Opérateur</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Motif</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                              <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                {new Date(tx.created_at).toLocaleString('fr-FR', {
                                  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5">
                                {tx.type === 'deposit' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                    <ArrowDownRight className="h-3 w-3" />
                                    Dépôt
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                                    <ArrowUpRight className="h-3 w-3" />
                                    Retrait
                                  </span>
                                )}
                              </td>
                              <td className={`whitespace-nowrap px-5 py-3.5 text-sm font-bold ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {tx.type === 'deposit' ? '+' : '-'} {tx.amount.toLocaleString('fr-FR')} CFA
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900">
                                {tx.balance_after.toLocaleString('fr-FR')} CFA
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                {tx.user ? tx.user.name || '—' : 'Système'}
                              </td>
                              <td className="px-5 py-3.5 text-sm text-gray-500">
                                {tx.description || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {transLastPage > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                        <button
                          type="button"
                          disabled={transPage <= 1 || transactionsLoading}
                          onClick={() => setTransPage((p) => p - 1)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          ← Précédent
                        </button>
                        <span className="text-sm text-gray-500">
                          Page {transPage} / {transLastPage}
                        </span>
                        <button
                          type="button"
                          disabled={transPage >= transLastPage || transactionsLoading}
                          onClick={() => setTransPage((p) => p + 1)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Suivant →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <CustomerCreateModal
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          loadCustomer()
        }}
      />

      {customer && (
        <CustomerTransactionModal
          open={transModalOpen}
          customerId={customer.id}
          type={transType}
          onClose={() => setTransModalOpen(false)}
          onSuccess={() => {
            loadCustomer()
            if (activeTab === 'transactions') {
              setTransPage(1)
              loadTransactions()
            } else {
              setActiveTab('transactions')
            }
          }}
        />
      )}
    </div>
  )
}
