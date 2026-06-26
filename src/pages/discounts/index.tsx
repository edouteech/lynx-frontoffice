import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable, {
  type Action,
  type Column,
} from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  createDiscount,
  deleteDiscount,
  fetchDiscounts,
  updateDiscount,
} from '../../api/discounts'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Discount, Store } from '../../types/api'
import Swal from 'sweetalert2'

export default function DiscountsIndex() {
  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<{
    data: Discount[]
    current_page: number
    last_page: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stores, setStores] = useState<Store[]>([])

  const [name, setName] = useState('')
  const [type, setType] = useState<'percentage' | 'amount' | 'variant'>('percentage')
  const [value, setValue] = useState<number | ''>('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchStores(1).then((res) => setStores(res.data)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDiscounts(page)
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
    setType('percentage')
    setValue('')
    setSelectedStoreIds([])
    setRequiresPassword(false)
    setEditing(null)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  const startEdit = useCallback((d: Discount) => {
    setEditing(d)
    setName(d.name)
    setType(d.type)
    setValue(d.value)
    setSelectedStoreIds(d.stores?.map(s => s.id) || [])
    setRequiresPassword(d.requires_password)
    setShowModal(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedStoreIds.length === 0) return
    if (type !== 'variant' && value === '') return
    
    setSaving(true)
    setError(null)
    const payload = {
      store_ids: selectedStoreIds,
      name: name.trim(),
      type,
      value: type === 'variant' ? 0 : Number(value),
      requires_password: requiresPassword,
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
        await updateDiscount(editing.id, payload)
      } else {
        await createDiscount(payload)
      }
      const actionText = editing ? 'modifiée' : 'créée'
      setShowModal(false)
      resetForm()
      const res = await fetchDiscounts(page)
      setPaginated({
        data: res.data,
        current_page: res.current_page,
        last_page: res.last_page,
        total: res.total,
      })
      Swal.fire({
        title: editing ? 'Modifiée !' : 'Créée !',
        text: `La réduction "${payload.name}" a été ${actionText} avec succès.`,
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

  const handleDelete = useCallback(
    async (d: Discount) => {
      const result = await Swal.fire({
        title: 'Supprimer la réduction ?',
        text: `Voulez-vous vraiment supprimer la réduction "${d.name}" ? Cette action est irréversible.`,
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
        await deleteDiscount(d.id)
        if (editing?.id === d.id) resetForm()
        const res = await fetchDiscounts(page)
        setPaginated({
          data: res.data,
          current_page: res.current_page,
          last_page: res.last_page,
          total: res.total,
        })
        Swal.fire({
          title: 'Supprimée !',
          text: `La réduction "${d.name}" a été supprimée avec succès.`,
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
          text: "Impossible de supprimer cette réduction.",
          icon: 'error',
          confirmButtonColor: '#3B82F6',
        })
      }
    },
    [page, editing?.id]
  )

  const columns: Column<Discount>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'store_id',
        label: 'Magasins',
        render: (_, item) => {
          const count = item.stores?.length || 0
          if (count === 0) return <span className="text-gray-400">Aucun</span>
          if (count === stores.length && stores.length > 0) return <span className="font-medium text-[#3B82F6]">Tous les magasins</span>
          return `${count} magasin${count > 1 ? 's' : ''}`
        },
      },
      {
        key: 'type',
        label: 'Type',
        render: (v) => {
          switch (v) {
            case 'percentage': return 'Pourcentage (%)'
            case 'amount': return 'Montant fixe'
            case 'variant': return 'Variable'
            default: return String(v)
          }
        },
      },
      {
        key: 'value',
        label: 'Valeur',
        render: (v, item) => item.type === 'variant' ? '—' : String(v),
      },
      {
        key: 'requires_password',
        label: 'Mot de passe',
        render: (v) => v ? 'Oui' : 'Non',
      },
    ],
    [stores]
  )

  const actions: Action<Discount>[] = useMemo(
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
        onClick: (d) => void handleDelete(d),
      },
    ],
    [startEdit, handleDelete]
  )

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Réductions</h1>
          <p className="mt-1 text-gray-600">
            Gestion des réductions applicables par magasin
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Ajouter une réduction
        </button>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier la réduction' : 'Nouvelle réduction'}
        subtitle="Définissez les paramètres de la réduction et les magasins concernés."
        preventClose={saving}
        maxWidthClassName="max-w-3xl"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5 py-2">
          
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {/* Colonne gauche */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  placeholder="Ex. Réduction Étudiant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  >
                    <option value="percentage">Pourcentage</option>
                    <option value="amount">Montant</option>
                    <option value="variant">Variant (libre)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Valeur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                    required={type !== 'variant'}
                    disabled={type === 'variant'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 disabled:bg-gray-100"
                    placeholder={type === 'percentage' ? '10' : '1000'}
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={requiresPassword}
                    onChange={(e) => setRequiresPassword(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  Mot de passe requis pour appliquer la réduction
                </label>
              </div>
            </div>

            {/* Colonne droite : Magasins */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Magasins <span className="text-red-500">*</span>
                </span>
                {stores.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.length === stores.length}
                      onChange={(e) =>
                        setSelectedStoreIds(e.target.checked ? stores.map(s => s.id) : [])
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    Tout sélectionner
                  </label>
                )}
              </div>

              <div
                className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2.5"
                style={{ minHeight: '180px', maxHeight: '250px' }}
              >
                {stores.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">
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
                            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                          />
                          <span className="flex-1 truncate">{m.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              {selectedStoreIds.length === 0 && (
                <p className="mt-1 text-xs text-red-500">Veuillez sélectionner au moins un magasin.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || selectedStoreIds.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      <DataTable<Discount>
        data={paginated?.data ?? []}
        columns={columns}
        actions={actions}
        loading={loading && !paginated}
        exportFilename="reductions"
        searchable
        searchPlaceholder="Rechercher une réduction…"
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
        emptyMessage="Aucune réduction."
        getRowId={(d) => d.id}
      />
    </div>
  )
}
