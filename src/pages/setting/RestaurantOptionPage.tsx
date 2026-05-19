import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, ClipboardList } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  createRestaurantOption,
  deleteRestaurantOption,
  fetchRestaurantOptions,
  updateRestaurantOption,
} from '../../api/restaurantOptions'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { RestaurantOption, Store } from '../../types/api'

// ─── Modal Create / Edit ───────────────────────────────────────────────────────

interface RestaurantOptionModalProps {
  open: boolean
  option: RestaurantOption | null
  onClose: () => void
  onSaved: () => void
}

function RestaurantOptionModal({
  open,
  option,
  onClose,
  onSaved,
}: RestaurantOptionModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])

  const isEdit = option !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, option?.id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open) return
      try {
        const res = await fetchStores(1)
        if (!cancelled) setStores(res.data ?? [])
      } catch {
        // silencieux
      }
    }
    void load()
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!option) {
      setName('')
      setDescription('')
      setStatus('active')
      setSelectedStoreIds([])
      return
    }
    setName(option.name)
    setDescription(option.description ?? '')
    setStatus(option.status)
    setSelectedStoreIds((option.stores ?? []).map((s) => s.id))
  }, [open, option])

  const allStoreIds = useMemo(() => stores.map((s) => s.id), [stores])
  const allSelected =
    allStoreIds.length > 0 && allStoreIds.every((id) => selectedStoreIds.includes(id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      store_ids: selectedStoreIds,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && option) {
        await updateRestaurantOption(option.id, payload)
      } else {
        await createRestaurantOption(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={submitting}
      maxWidthClassName="max-w-4xl"
      title={isEdit ? "Modifier l'option de restauration" : 'Nouvelle option de restauration'}
      subtitle="Définissez le nom, la description, le statut et les magasins concernés."
    >
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        key={isEdit && option ? `edit-${option.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
      >
        {/* ── Layout deux colonnes ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">

          {/* ── Colonne gauche : champs ── */}
          <div className="space-y-4">
            {/* Nom */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Ex. Sur place, À emporter, Livraison…"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Description facultative…"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Statut
              </label>
              <div className="flex gap-3">
                {(['active', 'inactive'] as const).map((s) => (
                  <label
                    key={s}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      status === s
                        ? s === 'active'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-400 bg-gray-100 text-gray-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="sr-only"
                    />
                    <span
                      className={`h-2 w-2 rounded-full ${
                        s === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    />
                    {s === 'active' ? 'Actif' : 'Inactif'}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Colonne droite : sélection des magasins ── */}
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Magasins activés
              </span>
              {stores.length > 0 && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      setSelectedStoreIds(e.target.checked ? allStoreIds : [])
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  Tout sélectionner
                </label>
              )}
            </div>

            {/* Liste avec scroll */}
            <div
              className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2.5"
              style={{ minHeight: '260px', maxHeight: '340px' }}
            >
              {stores.length === 0 ? (
                <p className="py-12 text-center text-xs text-gray-400">
                  Aucun magasin disponible.
                </p>
              ) : (
                <div className="space-y-1">
                  {stores.map((m) => {
                    const checked = selectedStoreIds.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                          checked
                            ? 'bg-[#3B82F6]/10 text-[#1D4ED8] font-medium'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedStoreIds((prev) =>
                              e.target.checked
                                ? [...prev, m.id]
                                : prev.filter((id) => id !== m.id)
                            )
                          }
                          className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                        />
                        <span className="truncate">{m.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Compteur */}
            <p className="mt-2 text-xs text-gray-400">
              {selectedStoreIds.length === 0
                ? "Aucun magasin sélectionné — option inactive partout."
                : `${selectedStoreIds.length} magasin${selectedStoreIds.length > 1 ? 's' : ''} sélectionné${selectedStoreIds.length > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>

        {/* ── Boutons ─────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : "Créer l'option"}
          </button>
          <button
            type="button"
            onClick={() => { if (!submitting) onClose() }}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return status === 'active' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Inactif
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RestaurantOptionPage() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: RestaurantOption[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<RestaurantOption | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchRestaurantOptions(page)
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
        const res = await fetchRestaurantOptions(page)
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

  const handleDelete = useCallback(
    async (opt: RestaurantOption) => {
      if (!window.confirm(`Supprimer l'option « ${opt.name} » ?`)) return
      setError(null)
      try {
        await deleteRestaurantOption(opt.id)
        await load()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [load]
  )

  const columns: Column<RestaurantOption>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'description',
        label: 'Description',
        render: (v) =>
          v ? (
            <span className="max-w-[260px] truncate text-gray-700">{String(v)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'status',
        label: 'Statut',
        render: (_v, item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'stores',
        label: 'Magasins',
        render: (_v, item) => {
          const names = (item.stores ?? []).map((s) => s.name)
          if (!names.length) return <span className="text-gray-400">—</span>
          return (
            <span className="max-w-[260px] truncate text-gray-700">
              {names.join(', ')}
            </span>
          )
        },
      },
    ],
    []
  )

  const actions: Action<RestaurantOption>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (opt) => {
          setEditingOption(opt)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (opt) => void handleDelete(opt),
      },
    ],
    [handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#2563EB]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Options de restauration
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gérez les options (Sur place, À emporter…) et activez-les par magasin.
            </p>
          </div>
        </div>
        <button
          type="button"
          id="btn-new-restaurant-option"
          onClick={() => {
            setEditingOption(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle option
        </button>
      </header>

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <DataTable<RestaurantOption>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="options-de-restauration"
        searchable
        searchPlaceholder="Rechercher une option…"
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
        emptyMessage="Aucune option de restauration"
      />

      <RestaurantOptionModal
        open={modalOpen}
        option={editingOption}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
