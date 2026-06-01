import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Percent } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import {
  createVatRate,
  deleteVatRate,
  fetchVatRates,
  updateVatRate,
} from '../../api/vatRates'
import { getApiErrorMessage } from '../../lib/apiError'
import { useAuth } from '../../contexts/useAuth'
import type { VatRate } from '../../types/api'
import Swal from 'sweetalert2'

function normalizeRateForInput(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const n = Number(raw)
  if (!Number.isFinite(n)) return raw
  // Évite l'affichage "17.0000" dans l'input.
  // Exemple: 17.5000 -> "17.5"
  return String(n)
}

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

export default function VatRatesIndex() {
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

  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [editing, setEditing] = useState<VatRate | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchVatRates(page)
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

  function resetForm() {
    setName('')
    setRate('')
    setEditing(null)
  }

  const startEdit = useCallback((t: VatRate) => {
    setEditing(t)
    setName(t.name)
    setRate(normalizeRateForInput(t.rate))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      rate: rate.trim(),
    }

    Swal.fire({
      title: editing ? 'Modification...' : 'Création...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      if (editing) {
        await updateVatRate(editing.id, payload)
      } else {
        // Par défaut on crée une TVA "entreprise" pour éviter de créer par erreur une TVA par défaut.
        await createVatRate({
          ...payload,
          organization_id: organizationId,
        })
      }
      const actionText = editing ? 'modifiée' : 'créée'
      resetForm()
      const res = await fetchVatRates(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
      Swal.fire({
        title: editing ? 'Modifiée !' : 'Créée !',
        text: `La TVA "${payload.name}" a été ${actionText} avec succès.`,
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
        text: getApiErrorMessage(err),
        icon: 'error',
        confirmButtonColor: '#3B82F6',
      })
    } finally {
      setSaving(false)
    }
  }

  const canManage = useCallback(
    (t: VatRate) =>
      t.organization_id != null &&
      organizationId != null &&
      t.organization_id === organizationId,
    [organizationId]
  )

  const handleDelete = useCallback(
    async (t: VatRate) => {
      const result = await Swal.fire({
        title: 'Supprimer la TVA ?',
        text: `Voulez-vous vraiment supprimer la TVA "${t.name}" ? Cette action est irréversible.`,
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
        title: 'Suppression...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      try {
        await deleteVatRate(t.id)
        if (editing?.id === t.id) resetForm()
        const res = await fetchVatRates(page)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
        Swal.fire({
          title: 'Supprimée !',
          text: `La TVA "${t.name}" a été supprimée avec succès.`,
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
          text: "Impossible de supprimer cette TVA.",
          icon: 'error',
          confirmButtonColor: '#3B82F6',
        })
      }
    },
    [page, editing?.id]
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
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: startEdit,
        show: canManage,
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (t) => void handleDelete(t),
        show: canManage,
      },
    ],
    [startEdit, handleDelete, canManage]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F2E4A] shadow-sm">
              <Percent className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-semibold text-gray-900">TVA</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Liste des TVA par défaut  et de votre entreprise.
          </p>
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

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editing ? 'Modifier la TVA' : 'Nouvelle TVA (entreprise)'}
        </h2>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="vat-rate-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              id="vat-rate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. TVA 18%"
              title="Nom"
              aria-label="Nom"
            />
          </div>

          <div className="sm:w-48">
            <label
              htmlFor="vat-rate-value"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Taux (%) <span className="text-red-500">*</span>
            </label>
            <input
              id="vat-rate-value"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
              inputMode="decimal"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="18"
              title="Taux"
              aria-label="Taux"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || (editing ? !canManage(editing) : false)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <DataTable<VatRate>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="tva"
        searchable
        searchPlaceholder="Rechercher une TVA…"
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
        emptyMessage="Aucune TVA."
        getRowId={(t) => t.id}
      />
    </div>
  )
}
