import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { deleteSupplier, fetchSuppliers } from '../../api/suppliers'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Supplier } from '../../types/api'
import { SupplierModal } from './create'

export default function SuppliersIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Supplier[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSupplier, setModalSupplier] = useState<Supplier | null>(null)

  const refreshList = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchSuppliers(page)
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
        const res = await fetchSuppliers(page)
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
    return () => { cancelled = true }
  }, [page])

  const handleDelete = useCallback(async (s: Supplier) => {
    if (!window.confirm(`Supprimer le fournisseur « ${s.name} » ?`)) return
    setError(null)
    try {
      await deleteSupplier(s.id)
      const res = await fetchSuppliers(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }, [page])

  const columns: Column<Supplier>[] = useMemo(() => [
    { key: 'name', label: 'Nom', sortable: true },
    {
      key: 'contact_name',
      label: 'Contact',
      sortable: true,
      render: v => v ? String(v) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: v => v ? (
        <a href={`mailto:${String(v)}`} className="text-[#3B82F6] hover:underline">
          {String(v)}
        </a>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: v => v ? String(v) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'address',
      label: 'Adresse',
      render: v => v ? String(v) : <span className="text-gray-400">—</span>,
    },
    {
      key: 'tax_id',
      label: 'IFU',
      render: v => v ? (
        <span className="font-mono text-xs">{String(v)}</span>
      ) : <span className="text-gray-400">—</span>,
    },
  ], [])

  const actions: Action<Supplier>[] = useMemo(() => [
    {
      label: 'Modifier',
      icon: Pencil,
      variant: 'primary',
      onClick: s => {
        setModalSupplier(s)
        setModalOpen(true)
      },
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: s => void handleDelete(s),
    },
  ], [handleDelete])

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Fournisseurs</h1>
          <p className="mt-1 text-gray-600">
            Gérez vos fournisseurs (création, modification, suppression).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalSupplier(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouveau fournisseur
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <DataTable<Supplier>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        searchable
        searchPlaceholder="Rechercher un fournisseur…"
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
        emptyMessage="Aucun fournisseur"
      />

      <SupplierModal
        open={modalOpen}
        supplier={modalSupplier}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refreshList()}
      />
    </div>
  )
}
