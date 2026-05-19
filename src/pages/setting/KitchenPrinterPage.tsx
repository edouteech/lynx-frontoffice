import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  createKitchenPrinter,
  deleteKitchenPrinter,
  fetchKitchenPrinters,
  updateKitchenPrinter,
  fetchAvailableCategories,
} from '../../api/kitchenPrinters'
import { getApiErrorMessage } from '../../lib/apiError'
import type { KitchenPrinter, ItemCategory } from '../../types/api'

// ─── Modal Create / Edit ───────────────────────────────────────────────────────

interface KitchenPrinterModalProps {
  open: boolean
  printer: KitchenPrinter | null
  onClose: () => void
  onSaved: () => void
}

function KitchenPrinterModal({
  open,
  printer,
  onClose,
  onSaved,
}: KitchenPrinterModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [availableCats, setAvailableCats] = useState<Array<Pick<ItemCategory, 'id' | 'name' | 'color'>>>([])
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([])

  const isEdit = printer !== null

  // Clear errors and load available categories
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open) return
      setError(null)
      try {
        const cats = await fetchAvailableCategories(printer?.id)
        if (!cancelled) {
          setAvailableCats(cats)
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err))
      }
    }
    void load()
    return () => { cancelled = true }
  }, [open, printer])

  // Populate form when editing
  useEffect(() => {
    if (!open) return
    if (!printer) {
      setName('')
      setStatus('active')
      setSelectedCatIds([])
      return
    }
    setName(printer.name)
    setStatus(printer.status)
    setSelectedCatIds((printer.item_categories ?? []).map((c) => c.id))
  }, [open, printer])

  const allCatIds = useMemo(() => availableCats.map((c) => c.id), [availableCats])
  const allSelected =
    allCatIds.length > 0 && allCatIds.every((id) => selectedCatIds.includes(id))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    const payload = {
      name: name.trim(),
      status,
      category_ids: selectedCatIds,
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isEdit && printer) {
        await updateKitchenPrinter(printer.id, payload)
      } else {
        await createKitchenPrinter(payload)
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
      title={isEdit ? "Modifier l'imprimante cuisine" : 'Nouvelle imprimante cuisine'}
      subtitle="Définissez le nom, le statut et les catégories d'articles affectées."
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
        key={isEdit && printer ? `edit-${printer.id}` : 'create'}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* ── LEFT : Form Fields ── */}
          <div className="space-y-4">
            {/* Nom */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom de l'imprimante <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                placeholder="Ex. Imprimante Bar, Cuisine Chaude…"
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
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
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

          {/* ── RIGHT : Categories selection ── */}
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Catégories assignées
              </span>
              {availableCats.length > 0 && (
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      setSelectedCatIds(e.target.checked ? allCatIds : [])
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  Tout sélectionner
                </label>
              )}
            </div>

            {/* Scrollable checklist of available categories */}
            <div
              className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2.5"
              style={{ minHeight: '260px', maxHeight: '340px' }}
            >
              {availableCats.length === 0 ? (
                <p className="py-12 text-center text-xs text-gray-400">
                  Aucune catégorie disponible.
                  <br />
                  <span className="text-[11px] text-gray-400">
                    (Toutes les catégories sont déjà affectées à d'autres imprimantes)
                  </span>
                </p>
              ) : (
                <div className="space-y-1">
                  {availableCats.map((c) => {
                    const checked = selectedCatIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                          checked
                            ? 'bg-[#3B82F6]/10 text-[#1D4ED8] font-medium'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedCatIds((prev) =>
                              e.target.checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id)
                            )
                          }
                          className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                        />
                        {c.color && (
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: c.color }}
                          />
                        )}
                        <span className="truncate">{c.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {selectedCatIds.length === 0
                ? 'Aucune catégorie sélectionnée.'
                : `${selectedCatIds.length} catégorie${selectedCatIds.length > 1 ? 's' : ''} sélectionnée${selectedCatIds.length > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {isEdit ? 'Enregistrer' : "Créer l'imprimante"}
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

export default function KitchenPrinterPage() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: KitchenPrinter[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<KitchenPrinter | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchKitchenPrinters(page)
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
        const res = await fetchKitchenPrinters(page)
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
    async (kp: KitchenPrinter) => {
      if (!window.confirm(`Supprimer l'imprimante « ${kp.name} » ?`)) return
      setError(null)
      try {
        await deleteKitchenPrinter(kp.id)
        await load()
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [load]
  )

  const columns: Column<KitchenPrinter>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'status',
        label: 'Statut',
        render: (_v, item) => <StatusBadge status={item.status} />,
      },
      {
        key: 'item_categories',
        label: 'Catégories d\'articles',
        render: (_v, item) => {
          const cats = item.item_categories ?? []
          if (!cats.length) return <span className="text-gray-400">Aucune catégorie</span>
          return (
            <div className="flex flex-wrap gap-1.5 max-w-[400px]">
              {cats.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border border-gray-200 bg-white text-gray-800"
                >
                  {c.color && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                  {c.name}
                </span>
              ))}
            </div>
          )
        },
      },
    ],
    []
  )

  const actions: Action<KitchenPrinter>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: (kp) => {
          setEditingPrinter(kp)
          setModalOpen(true)
        },
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (kp) => void handleDelete(kp),
      },
    ],
    [handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#2563EB]">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Imprimantes cuisine
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gérez vos imprimantes cuisine et associez-y des catégories d'articles exclusives.
            </p>
          </div>
        </div>
        <button
          type="button"
          id="btn-new-kitchen-printer"
          onClick={() => {
            setEditingPrinter(null)
            setModalOpen(true)
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle imprimante
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

      <DataTable<KitchenPrinter>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="imprimantes-cuisine"
        searchable
        searchPlaceholder="Rechercher une imprimante…"
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
        emptyMessage="Aucune imprimante cuisine"
      />

      <KitchenPrinterModal
        open={modalOpen}
        printer={editingPrinter}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
