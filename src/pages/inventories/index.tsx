import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ClipboardCheck, Loader2, Plus, Printer, Trash2, X } from 'lucide-react'
import { fetchInventories, deleteInventory } from '../../api/inventories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Inventory } from '../../types/api'
import { OwnerOnly } from '../../components/Can'

function StatusBadge({ status }: { status: Inventory['status'] }) {
  return status === 'applied'
    ? <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Appliqué</span>
    : <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Brouillon</span>
}

function TypeBadge({ type }: { type: Inventory['type'] }) {
  return type === 'full'
    ? <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Complet</span>
    : <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Partiel</span>
}

export default function InventoriesIndex() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const [flash, setFlash] = useState<string | null>(() => {
    const s = location.state as { flash?: string } | null
    return s?.flash ?? null
  })
  useEffect(() => {
    if (flash) {
      window.history.replaceState({}, '')
      const t = setTimeout(() => setFlash(null), 5000)
      return () => clearTimeout(t)
    }
  }, [flash])

  const [inventories, setInventories] = useState<Inventory[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal]       = useState(0)

  async function load(p: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchInventories(p)
      setInventories(res.data)
      setLastPage(res.last_page)
      setTotal(res.total)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page])

  async function handleDelete(inv: Inventory) {
    if (!window.confirm(`Supprimer l'inventaire du ${new Date(inv.created_at).toLocaleDateString('fr-FR')} ?`)) return
    try {
      await deleteInventory(inv.id)
      void load(page)
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const progress = (inv: Inventory) => inv.items_count > 0
    ? Math.round((inv.filled_count / inv.items_count) * 100)
    : 0

  return (
    <div className="space-y-5 min-w-0 max-w-full">
      {/* ─── Sticky Header Card ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 rounded-xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F2E4A] text-white shadow-sm">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">Inventaires</h1>
              <p className="text-xs text-gray-500">Gestion des inventaires physiques de stock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/inventories/create')}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-[#2563EB] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouvel inventaire
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        {flash && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <span>{flash}</span>
            <button type="button" onClick={() => setFlash(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" /></div>
        ) : inventories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
            <ClipboardCheck className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">Aucun inventaire pour le moment.</p>
            <button
              type="button"
              onClick={() => navigate('/inventories/create')}
              className="mt-3 text-[#3B82F6] hover:underline text-sm font-semibold"
            >
              Créer votre premier inventaire →
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-w-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Magasin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Progression</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Articles</th>
                    <th className="w-28 px-4 py-3 whitespace-nowrap" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventories.map(inv => (
                    <tr key={inv.id}
                      onClick={() => navigate(`/inventories/${inv.id}`)}
                      className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{inv.store?.name ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={inv.type} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {inv.items_count > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#3B82F6] h-1.5 rounded-full transition-all"
                                style={{ width: `${progress(inv)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums">{progress(inv)}%</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-xs text-gray-500 tabular-nums">
                          {inv.filled_count} / {inv.items_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/inventories/${inv.id}/print`)}
                            title="Imprimer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {inv.status === 'draft' && (
                            <OwnerOnly>
                              <button
                                type="button"
                                onClick={() => void handleDelete(inv)}
                                title="Supprimer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </OwnerOnly>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {lastPage > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-gray-500">{total} inventaire{total > 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50">
                    Précédent
                  </button>
                  <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50">
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
