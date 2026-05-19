import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { fetchVatRates, restoreVatRate } from '../../api/vatRates'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import type { VatRate } from '../../types/api'

function scopeBadge(vatRate: VatRate, organizationId?: number | null) {
  if (vatRate.organization_id == null) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
        Par défaut
      </span>
    )
  }
  if (organizationId != null && vatRate.organization_id === organizationId) {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
        Mon entreprise
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
      Entreprise #{vatRate.organization_id}
    </span>
  )
}

export default function TrashVatRates() {
  const { activeOrganizationId } = useAuth()
  const organizationId = activeOrganizationId

  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: VatRate[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchVatRates(page, true)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
      setPaginated(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRestore = useCallback(
    async (t: VatRate) => {
      if (!window.confirm(`Restaurer la TVA « ${t.name} » ?`)) return
      setError(null)
      setSuccess(null)
      try {
        await restoreVatRate(t.id)
        setSuccess(`La TVA « ${t.name} » a été restaurée avec succès.`)
        void loadData()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [loadData]
  )

  const columns: Column<VatRate>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'rate',
        label: 'Taux',
        sortable: true,
        align: 'right',
        nowrap: true,
        render: (v) => (
          <span className="font-semibold text-gray-900">
            {Number(String(v)).toLocaleString('fr-FR', { maximumFractionDigits: 4 })}%
          </span>
        ),
      },
      {
        key: 'organization_id',
        label: 'Portée',
        render: (_v, row) => scopeBadge(row, organizationId),
      },
    ],
    [organizationId]
  )

  const actions: Action<VatRate>[] = useMemo(
    () => [
      {
        label: 'Restaurer',
        icon: RotateCcw,
        variant: 'primary',
        onClick: (t) => void handleRestore(t),
      },
    ],
    [handleRestore]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Corbeille - TVA</h1>
        <p className="mt-1 text-gray-600">
          Liste des taux de TVA supprimés. Vous pouvez les restaurer pour les rendre à nouveau actifs.
        </p>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="alert"
        >
          {success}
        </div>
      )}

      <DataTable<VatRate>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="tva_supprimees"
        searchable
        searchPlaceholder="Rechercher une TVA supprimée…"
        pagination={false}
        serverPagination={
          paginated
            ? {
                currentPage: paginated.current_page,
                lastPage: paginated.last_page,
                total: paginated.total,
                onPageChange: setPage,
                disabled: loading,
              }
            : undefined
        }
        emptyMessage="Aucune TVA dans la corbeille."
        getRowId={(t) => t.id}
      />
    </div>
  )
}
