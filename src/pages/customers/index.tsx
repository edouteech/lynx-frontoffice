import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2, Eye, Upload } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deleteCustomer, fetchCustomers } from '../../api/customer'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Customer } from '../../types/api'
import { CustomerCreateModal } from './create'
import { CustomerImportModal } from './import'
import Swal from 'sweetalert2'

export default function CustomersIndex() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Customer[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCustomer, setModalCustomer] = useState<Customer | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchCustomers(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }, [page])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchCustomers(page)
        if (!cancelled) {
          setPaginated({
            data: res.data,
            current_page: res.current_page,
            last_page: res.last_page,
            total: res.total,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setError(getApiErrorMessage(e))
          setPaginated(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [page])

  const handleDelete = useCallback(
    async (c: Customer) => {
      const result = await Swal.fire({
        title: 'Supprimer le client ?',
        text: `Voulez-vous vraiment supprimer le client "${c.name}" ? Cette action est irréversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        reverseButtons: true,
      })

      if (!result.isConfirmed) return

      setError(null)

      Swal.fire({
        title: 'Suppression en cours...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      try {
        await deleteCustomer(c.id)
        const res = await fetchCustomers(page)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
        Swal.fire({
          title: 'Supprimé !',
          text: `Le client "${c.name}" a été supprimé avec succès.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de supprimer ce client.',
          icon: 'error',
          confirmButtonColor: '#3B82F6',
        })
      }
    },
    [page]
  )

  const columns: Column<Customer>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'phone',
        label: 'Téléphone',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'tax_id',
        label: 'IFU',
        sortable: true,
        render: (v) => (v ? String(v) : <span className="text-gray-400">—</span>),
      },
      {
        key: 'discount_percentage',
        label: 'Réduction (%)',
        sortable: true,
        render: (v) => (v ? `${v}%` : <span className="text-gray-400">—</span>),
      },
    ],
    []
  )

  const actions: Action<Customer>[] = useMemo(
    () => [
      {
        label: 'Voir',
        icon: Eye,
        variant: 'primary',
        onClick: (c) => navigate(`/customers/${c.id}`),
      },
      {
        label: 'Modifier',
        icon: Pencil,
        onClick: (c) => {
          setModalCustomer(c)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (c) => void handleDelete(c),
      },
    ],
    [navigate, handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-1 text-gray-600">
            Gestion des clients (création, modification, suppression).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Importer Excel
          </button>

          <button
            type="button"
            onClick={() => {
              setModalCustomer(null)
              setModalOpen(true)
            }}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        </div>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <DataTable<Customer>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="clients"
        searchable
        searchPlaceholder="Rechercher un client…"
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: (p) => setPage(p),
                disabled: loading,
              }
            : undefined
        }
        emptyMessage="Aucun client"
      />

      <CustomerCreateModal
        open={modalOpen}
        customer={modalCustomer}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refreshList()}
      />

      <CustomerImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => void refreshList()}
      />
    </div>
  )
}
