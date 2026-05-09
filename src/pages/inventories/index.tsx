import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ClipboardCheck, Loader2, Plus, X } from 'lucide-react'
import { fetchInventories, deleteInventory } from '../../api/inventories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Inventory } from '../../types/api'

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
    <div className="space-y-6">

      {/* header */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2E4A]">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventaires</h1>
              <p className="text-sm text-gray-500">Gestion des inventaires physiques de stock</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/inventories/create')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Nouvel inventaire
          </button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-4">
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
            <ClipboardCheck className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">Aucun inventaire pour le moment.</p>
            <button
              type="button"
              onClick={() => navigate('/inventories/create')}
              className="mt-4 text-[#3B82F6] hover:underline text-sm font-medium"
            >
              Créer votre premier inventaire →
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Magasin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Progression</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Articles</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventories.map(inv => (
                  <tr key={inv.id}
                    onClick={() => navigate(`/inventories/${inv.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.store?.name ?? '—'}</td>
                    <td className="px-4 py-3"><TypeBadge type={inv.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-center">
                      {inv.items_count > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#3B82F6] h-1.5 rounded-full transition-all"
                              style={{ width: `${progress(inv)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{progress(inv)}%</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-500">
                        {inv.filled_count} / {inv.items_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {inv.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(inv)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
