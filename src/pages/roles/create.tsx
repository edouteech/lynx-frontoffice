import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import { createRole, fetchRole, updateRole } from '../../api/roles'
import { fetchAllPermissions } from '../../api/permissions'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Permission, Role } from '../../types/api'

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  cash_register: 'Caisse',
  admin_panel: "Panneau d'administration",
}

export interface RoleFormModalProps {
  open: boolean
  role: Role | null
  onClose: () => void
  onSaved: () => void
}

export function RoleFormModal({
  open,
  role,
  onClose,
  onSaved,
}: RoleFormModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [loadingRole, setLoadingRole] = useState(false)

  const [roleName, setRoleName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const isEdit = role !== null

  useEffect(() => {
    if (open) setError(null)
  }, [open, role?.id])

  useEffect(() => {
    let cancelled = false
    async function loadPerms() {
      if (!open) return
      setLoadingRefs(true)
      try {
        const list = await fetchAllPermissions()
        if (!cancelled) setPermissions(list)
      } catch {
        if (!cancelled) setPermissions([])
      } finally {
        if (!cancelled) setLoadingRefs(false)
      }
    }
    void loadPerms()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!role) {
      setRoleName('')
      setDescription('')
      setSelectedIds([])
      return
    }

    const roleId = role.id
    let cancelled = false
    async function load() {
      setLoadingRole(true)
      setError(null)
      try {
        const full = await fetchRole(roleId)
        if (cancelled) return
        setRoleName(full.name)
        setDescription(full.description ?? '')
        setSelectedIds((full.permissions ?? []).map((p) => p.id))
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoadingRole(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, role])

  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions) {
      const g = p.category || 'other'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    }
    return map
  }, [permissions])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  function toggleId(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleGroup(ids: number[]) {
    const allOn = ids.length > 0 && ids.every((id) => selectedSet.has(id))
    setSelectedIds((prev) => {
      const s = new Set(prev)
      if (allOn) {
        for (const id of ids) s.delete(id)
      } else {
        for (const id of ids) s.add(id)
      }
      return Array.from(s)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: roleName.trim(),
        description: description.trim() || null,
        permission_ids: selectedIds,
      }
      if (isEdit) {
        await updateRole(role.id, payload)
      } else {
        await createRole(payload)
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
      title={isEdit ? 'Modifier le rôle' : 'Nouveau rôle'}
      subtitle={
        isEdit
          ? `Rôle « ${role.name} »`
          : 'Définissez le nom et les permissions associées.'
      }
      maxWidthClassName=""
    >
      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {loadingRole ? (
        <p className="text-sm text-gray-600">Chargement du rôle…</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="role-nom"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  id="role-nom"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  placeholder="Ex. Caissier"
                  title="Nom du rôle"
                  aria-label="Nom du rôle"
                />
              </div>
              <div>
                <label
                  htmlFor="role-desc"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  placeholder="Optionnel"
                  title="Description"
                  aria-label="Description"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Permissions
              </p>
              {loadingRefs ? (
                <p className="text-sm text-gray-500">Chargement…</p>
              ) : (
                <div className="max-h-[min(24rem,50vh)] space-y-4 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                  {Array.from(permissionsByCategory.entries()).map(
                    ([categoryKey, list]) => {
                    const ids = list.map((p) => p.id)
                    const allOn =
                      ids.length > 0 &&
                      ids.every((id) => selectedSet.has(id))
                    return (
                      <div key={categoryKey}>
                        <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                          <input
                            type="checkbox"
                            checked={allOn}
                            onChange={() => toggleGroup(ids)}
                            className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                            aria-label={`Sélectionner toutes les permissions ${PERMISSION_GROUP_LABELS[categoryKey] ?? categoryKey}`}
                          />
                          {PERMISSION_GROUP_LABELS[categoryKey] ?? categoryKey}
                        </label>
                        <ul className="space-y-2 pl-1">
                          {list.map((p) => (
                            <li key={p.id}>
                              <label className="flex cursor-pointer gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedSet.has(p.id)}
                                  onChange={() => toggleId(p.id)}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                                  aria-label={p.name}
                                />
                                <span>
                                  <span className="font-medium text-gray-900">
                                    {p.name}
                                  </span>
                                  {p.description ? (
                                    <span className="mt-0.5 block text-xs text-gray-600">
                                      {p.description}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {selectedIds.length} permission
                {selectedIds.length > 1 ? 's' : ''} sélectionnée
                {selectedIds.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {isEdit ? 'Enregistrer' : 'Créer le rôle'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!submitting) onClose()
              }}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
