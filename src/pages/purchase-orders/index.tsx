import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus, Store, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deletePurchaseOrder, fetchPurchaseOrders } from '../../api/purchaseOrders'
import { getApiErrorMessage } from '../../lib/apiError'
import type { PurchaseOrder } from '../../types/api'
import Can from '../../components/Can'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  submitted:          { label: 'Soumise',            className: 'bg-purple-100 text-purple-700' },
  confirmed:          { label: 'Confirmée',           className: 'bg-indigo-100 text-indigo-700' },
  validated:          { label: 'Validée',             className: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partiell. reçue',    className: 'bg-amber-100 text-amber-700' },
  completed:          { label: 'Terminée',            className: 'bg-green-100 text-green-700' },
}

interface Props {
  type: 'central' | 'supplier'
}

export default function PurchaseOrdersIndex({ type }: Props) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: PurchaseOrder[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPurchaseOrders(p, type)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { void load(page) }, [page, load])

  const handleDelete = useCallback(async (o: PurchaseOrder) => {
    const result = await Swal.fire({
      title: 'Supprimer la commande ?',
      text: `Supprimer la commande #${String(o.id).padStart(4, '0')} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
    })
    if (!result.isConfirmed) return
    try {
      await deletePurchaseOrder(o.id)
      void load(page)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }, [page, load])

  const columns: Column<PurchaseOrder>[] = useMemo(() => [
    {
      key: 'id',
      label: 'N° commande',
      render: v => <span className="font-mono font-semibold text-gray-700">#{String(v).padStart(4, '0')}</span>,
    },
    {
      key: 'source',
      label: type === 'central' ? 'Centrale d\'achat' : 'Fournisseur',
      render: (_, row) => type === 'central'
        ? (row.purchasing_center?.name ?? <span className="text-gray-400">—</span>)
        : (row.supplier?.name ?? <span className="text-gray-400">—</span>),
    },
    {
      key: 'store',
      label: 'Magasin',
      render: (_, row) => row.store?.name ?? <span className="text-gray-400">—</span>,
    },
    {
      key: 'order_date',
      label: 'Date commande',
      render: v => v ? new Date(String(v)).toLocaleDateString('fr-FR') : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      render: v => {
        const s = STATUS_LABELS[String(v)] ?? STATUS_LABELS.validated
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
      },
    },
    {
      key: 'subtotal',
      label: 'Sous-total',
      render: (_, row) => {
        const sub = (row as PurchaseOrder & { subtotal?: number }).subtotal ?? 0
        return <span className="font-semibold">{sub.toLocaleString('fr-FR')} CFA</span>
      },
    },
  ], [type])

  const actions: Action<PurchaseOrder>[] = useMemo(() => [
    {
      label: 'Voir / Modifier',
      icon: Eye,
      variant: 'primary',
      onClick: o => navigate(`/purchase-orders/${o.id}`),
      permission: 'admin_panel.orders.create_or_edit',
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: o => void handleDelete(o),
      permission: 'admin_panel.orders.create_or_edit',
    },
  ], [navigate, handleDelete])

  const isCentral = type === 'central'

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            {isCentral ? 'Commandes centrale d\'achat' : 'Commandes fournisseur'}
          </h1>
          <p className="mt-1 text-gray-600">
            {isCentral
              ? 'Gérez vos bons de commande passés auprès des centrales d\'achat.'
              : 'Gérez vos bons de commande passés auprès des fournisseurs.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCentral ? (
            <Can code="admin_panel.orders.create_or_edit">
              <button
                type="button"
                onClick={() => navigate('/central-orders/create')}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <Store className="h-4 w-4" />
                Nouvelle commande centrale
              </button>
            </Can>
          ) : (
            <Can code="admin_panel.orders.create_or_edit">
              <button
                type="button"
                onClick={() => navigate('/purchase-orders/create')}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
              >
                <Plus className="h-4 w-4" />
                Nouvelle commande fournisseur
              </button>
            </Can>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <DataTable<PurchaseOrder>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        searchable
        searchPlaceholder="Rechercher une commande…"
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: p => setPage(p),
                disabled: loading,
              }
            : undefined
        }
        emptyMessage="Aucune commande"
      />
    </div>
  )
}
