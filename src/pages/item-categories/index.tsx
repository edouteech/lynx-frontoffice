import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
import {
  createItemCategory,
  deleteItemCategory,
  fetchItemCategories,
  updateItemCategory,
} from '../../api/itemCategories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { ItemCategory } from '../../types/api'

/**
 * Gris médian : le nuancier natif positionne souvent le curseur de luminosité au milieu
 * (contrairement à #000000 qui le met tout en bas).
 */
const COLOR_PICKER_NEUTRAL = '#808080'

/** Valeur valide pour `<input type="color" />` (#rrggbb). */
function toColorInputValue(raw: string): string {
  let h = raw.trim()
  if (!h) return COLOR_PICKER_NEUTRAL
  if (!h.startsWith('#')) h = `#${h}`
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    const [r, g, b] = [h[1], h[2], h[3]]
    h = `#${r}${r}${g}${g}${b}${b}`
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toLowerCase()
  return COLOR_PICKER_NEUTRAL
}

export default function ItemCategoriesIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: ItemCategory[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [editing, setEditing] = useState<ItemCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const hiddenColorPickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchItemCategories(page)
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
    setColor('')
    setEditing(null)
  }

  const startEdit = useCallback((c: ItemCategory) => {
    setEditing(c)
    setName(c.name)
    setColor(c.color ?? '')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      name: name.trim(),
      color: color.trim() || null,
    }
    try {
      if (editing) {
        await updateItemCategory(editing.id, payload)
      } else {
        await createItemCategory(payload)
      }
      resetForm()
      const res = await fetchItemCategories(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(
    async (c: ItemCategory) => {
      if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) return
      setError(null)
      try {
        await deleteItemCategory(c.id)
        if (editing?.id === c.id) resetForm()
        const res = await fetchItemCategories(page)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    },
    [page, editing?.id]
  )

  const columns: Column<ItemCategory>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'color',
        label: 'Couleur',
        render: (v) =>
          v ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded border border-gray-200"
                style={{ backgroundColor: String(v) }}
              />
              <code className="text-xs text-gray-600">{String(v)}</code>
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
    ],
    []
  )

  const actions: Action<ItemCategory>[] = useMemo(
    () => [
      {
        label: 'Modifier',
        icon: Pencil,
        variant: 'primary',
        onClick: startEdit,
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        variant: 'danger',
        onClick: (c) => void handleDelete(c),
      },
    ],
    [startEdit, handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Catégories</h1>
        <p className="mt-1 text-gray-600">
          Gestion des catégories de votre entreprise
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

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h2>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="item-category-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              id="item-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              placeholder="Ex. Boissons"
            />
          </div>
          <div className="sm:min-w-[220px]">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Couleur (optionnel)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {color.trim() ? (
                <>
                  <input
                    id="item-category-color"
                    type="color"
                    value={toColorInputValue(color)}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-0.5 shadow-sm"
                    title="Modifier la couleur"
                    aria-label="Modifier la couleur"
                  />
                  <span className="font-mono text-xs text-gray-600">
                    {toColorInputValue(color)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setColor('')}
                    className="text-xs font-medium text-[#3B82F6] hover:text-[#2563EB]"
                  >
                    Effacer
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="item-category-color-bootstrap" className="sr-only">
                    Ouvrir le sélecteur de couleur
                  </label>
                  <input
                    id="item-category-color-bootstrap"
                    ref={hiddenColorPickerRef}
                    type="color"
                    className="sr-only"
                    tabIndex={-1}
                    value={COLOR_PICKER_NEUTRAL}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => hiddenColorPickerRef.current?.click()}
                    className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:border-[#3B82F6] hover:bg-[#EFF6FF]"
                  >
                    Choisir une couleur
                  </button>
                  <span className="text-xs text-gray-500">Aucune</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {editing ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
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

      <DataTable<ItemCategory>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="categories"
        searchable
        searchPlaceholder="Rechercher une catégorie…"
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
        emptyMessage="Aucune catégorie. Créez-en une ci-dessus."
        getRowId={(c) => c.id}
      />
    </div>
  )
}
