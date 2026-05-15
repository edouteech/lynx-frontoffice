import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, ClipboardCheck, FileText, Loader2,
  Printer, Save, Trash2, Upload,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import {
  fetchInventoryById, updateInventoryItem,
  applyInventory, deleteInventory, uploadInventoryFile,
} from '../../api/inventories'
import { getApiErrorMessage } from '../../lib/apiError'
import type { Inventory, InventoryItem } from '../../types/api'
import InventoryPdf from './InventoryPdf'

// ─── tiny helpers ─────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function DiffCell({ diff }: { diff: number | null }) {
  if (diff === null) return <span className="text-gray-300">—</span>
  if (diff === 0)    return <span className="font-medium text-gray-500">0</span>
  return (
    <span className={`font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {diff > 0 ? '+' : ''}{diff.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
    </span>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
  if (state === 'saved')  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  if (state === 'error')  return <span className="text-xs text-red-500">Erreur</span>
  return null
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function InventoryShowPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [applying,  setApplying]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // per-item local state: edited value + save state
  const [actualQtys,  setActualQtys]  = useState<Record<number, string>>({})
  const [saveStates,  setSaveStates]  = useState<Record<number, SaveState>>({})
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const isDraft   = inventory?.status === 'draft'
  const isApplied = inventory?.status === 'applied'

  // ── load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const inv = await fetchInventoryById(id)
      setInventory(inv)
      // initialise local qty state
      const qtys: Record<number, string> = {}
      inv.items?.forEach(item => {
        qtys[item.id] = item.actual_quantity != null ? String(item.actual_quantity) : ''
      })
      setActualQtys(qtys)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  // ── auto-save ─────────────────────────────────────────────────────────────

  async function saveItem(itemId: number, rawValue: string) {
    setSaveStates(prev => ({ ...prev, [itemId]: 'saving' }))
    try {
      const qty = rawValue.trim() === '' ? null : parseFloat(rawValue)
      const updated = await updateInventoryItem(id!, itemId, qty)
      // update local inventory items
      setInventory(prev => {
        if (!prev) return prev
        return {
          ...prev,
          filled_count: prev.items?.filter(i => i.id === itemId
            ? qty !== null : i.actual_quantity !== null).length ?? prev.filled_count,
          items: prev.items?.map(i => i.id === itemId
            ? { ...i, actual_quantity: updated.actual_quantity, difference: updated.difference }
            : i
          ),
        }
      })
      setSaveStates(prev => ({ ...prev, [itemId]: 'saved' }))
      setTimeout(() => setSaveStates(prev => ({ ...prev, [itemId]: 'idle' })), 2000)
    } catch {
      setSaveStates(prev => ({ ...prev, [itemId]: 'error' }))
    }
  }

  function handleQtyChange(itemId: number, value: string) {
    setActualQtys(prev => ({ ...prev, [itemId]: value }))
    if (timers.current[itemId]) clearTimeout(timers.current[itemId])
    timers.current[itemId] = setTimeout(() => void saveItem(itemId, value), 800)
  }

  function handleQtyBlur(itemId: number, value: string) {
    if (timers.current[itemId]) clearTimeout(timers.current[itemId])
    void saveItem(itemId, value)
  }

  // flush pending timers on unmount
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])

  // ── apply ─────────────────────────────────────────────────────────────────

  async function handleApply() {
    const filledCount = inventory?.items?.filter(i => i.actual_quantity != null).length ?? 0
    const totalCount  = inventory?.items_count ?? 0

    const unfilledMsg = filledCount < totalCount
      ? `\n\n⚠ Attention : ${totalCount - filledCount} article(s) n'ont pas de quantité saisie — ils ne seront pas modifiés.`
      : ''

    if (!window.confirm(
      `Appliquer cet inventaire au stock du magasin « ${inventory?.store?.name} » ?${unfilledMsg}\n\nCette action est irréversible.`
    )) return

    setApplying(true)
    setError(null)
    try {
      await applyInventory(id!)
      navigate('/inventories', {
        state: { flash: `Inventaire appliqué — stock de « ${inventory?.store?.name} » mis à jour.` },
      })
    } catch (e) {
      setError(getApiErrorMessage(e))
      setApplying(false)
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!window.confirm('Supprimer définitivement cet inventaire brouillon ?')) return
    setDeleting(true)
    try {
      await deleteInventory(id!)
      navigate('/inventories')
    } catch (e) {
      setError(getApiErrorMessage(e))
      setDeleting(false)
    }
  }

  // ── print (PDF) ───────────────────────────────────────────────────────────

  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    if (!inventory) return
    setPrinting(true)
    try {
      const blob = await pdf(<InventoryPdf inventory={inventory} />).toBlob()
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // release after a delay so the new tab has time to load it
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      setPrinting(false)
    }
  }

  // ── file upload ────────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadInventoryFile(id, file)
      setInventory(prev => prev ? { ...prev, file_path: result.file_path, file_name: result.file_name } : prev)
    } catch (err) {
      setUploadError(getApiErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── progress ──────────────────────────────────────────────────────────────

  const filledNow = inventory?.items?.filter(i => i.actual_quantity != null).length ?? 0
  const totalItems = inventory?.items_count ?? 0
  const pct = totalItems > 0 ? Math.round((filledNow / totalItems) * 100) : 0

  // ── loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFF6FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#EFF6FF]">
        <p className="text-sm text-red-600">{error ?? 'Inventaire introuvable.'}</p>
        <button type="button" onClick={() => navigate('/inventories')}
          className="flex items-center gap-2 text-sm text-[#3B82F6] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
      </div>
    )
  }

  const items = inventory.items ?? []

  return (
    <div className="space-y-6">

      {/* ─── sticky header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className=" flex  items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/inventories')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">
                  Inventaire — {inventory.store?.name}
                </h1>
                {isApplied
                  ? <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Appliqué</span>
                  : <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Brouillon</span>}
              </div>
              <p className="text-xs text-gray-400">
                {inventory.type === 'full' ? 'Inventaire complet' : 'Inventaire partiel'}
                {' · '}
                {new Date(inventory.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={printing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {printing ? 'Génération…' : 'Imprimer'}
            </button>

            {isDraft && (
              <>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer
                </button>
                <button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={applying}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Appliquer au stock
                </button>
              </>
            )}

            {isApplied && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Appliqué le {new Date(inventory.applied_at!).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className=" px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className=" px-6 py-5 space-y-5">

        {/* ─── infos + progression ─────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Articles',   value: String(totalItems) },
            { label: 'Comptés',    value: `${filledNow} / ${totalItems}` },
            { label: 'Progression', value: `${pct}%` },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{c.value}</p>
              {c.label === 'Progression' && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                  <div className="h-1.5 rounded-full bg-[#3B82F6] transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {isDraft && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
            <ClipboardCheck className="inline h-3.5 w-3.5 mr-1" />
            Sauvegarde automatique — chaque quantité saisie est enregistrée dès que vous quittez le champ.
            Les articles sans quantité saisie ne seront pas modifiés lors de l'application.
          </div>
        )}

        {/* ─── tableau des articles ─────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ClipboardCheck className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">Aucun article dans cet inventaire.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Article</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté attendue</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qté réelle</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Coût unitaire</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Différence</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Diff. coût</th>
                    <th className="w-8 px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item: InventoryItem) => {
                    const rawVal   = actualQtys[item.id] ?? ''
                    const parsedActual = rawVal.trim() !== '' ? parseFloat(rawVal) : null
                    const liveDiff = parsedActual !== null
                      ? Math.round((parsedActual - item.expected_quantity) * 1000) / 1000
                      : item.difference

                    const diffCost = liveDiff != null && item.selling_price != null
                      ? liveDiff * item.selling_price
                      : null

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${
                        liveDiff !== null && liveDiff !== 0 ? 'bg-orange-50/30' : ''
                      }`}>

                        {/* Article */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {item.product_color && /^#[0-9A-Fa-f]{6}$/.test(item.product_color) && (
                              <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-gray-200"
                                style={{ backgroundColor: item.product_color }} />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{item.product_name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                {item.product_sku && <span>{item.product_sku}</span>}
                                {item.product_category && (
                                  <>
                                    {item.product_sku && <span>·</span>}
                                    <span>{item.product_category}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Qté attendue */}
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {item.expected_quantity.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                        </td>

                        {/* Qté réelle */}
                        <td className="px-4 py-3 text-right">
                          {isDraft ? (
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={rawVal}
                              onChange={e => handleQtyChange(item.id, e.target.value)}
                              onBlur={e => handleQtyBlur(item.id, e.target.value)}
                              placeholder="—"
                              className="w-24 rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm tabular-nums placeholder-gray-300 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 float-right"
                            />
                          ) : (
                            <span className="tabular-nums text-gray-700">
                              {item.actual_quantity != null
                                ? item.actual_quantity.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
                                : <span className="text-gray-300">—</span>}
                            </span>
                          )}
                        </td>

                        {/* Coût unitaire */}
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {item.purchase_price != null
                            ? <>{item.purchase_price.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="text-xs text-gray-400">CFA</span></>
                            : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Différence */}
                        <td className="px-4 py-3 text-right">
                          <DiffCell diff={liveDiff} />
                        </td>

                        {/* Diff. coût */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          {diffCost == null ? (
                            <span className="text-gray-300">—</span>
                          ) : diffCost === 0 ? (
                            <span className="font-medium text-gray-500">0 <span className="text-xs font-normal text-gray-400">CFA</span></span>
                          ) : (
                            <span className={`font-semibold ${diffCost > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {diffCost > 0 ? '+' : ''}{diffCost.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">CFA</span>
                            </span>
                          )}
                        </td>

                        {/* Save indicator */}
                        <td className="px-3 py-3 text-center">
                          <SaveIndicator state={saveStates[item.id] ?? 'idle'} />
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total diff. coût
                    </td>
                    <td colSpan={4} />
                    <td className="px-4 py-3 text-right tabular-nums">
                      {(() => {
                        const total = items.reduce((sum, item) => {
                          const raw = actualQtys[item.id] ?? ''
                          const parsed = raw.trim() !== '' ? parseFloat(raw) : null
                          const diff = parsed !== null
                            ? parsed - item.expected_quantity
                            : item.difference
                          if (diff == null || item.selling_price == null) return sum
                          return sum + diff * item.selling_price
                        }, 0)
                        if (total === 0) return <span className="font-bold text-gray-500">0 <span className="text-xs font-normal text-gray-400">CFA</span></span>
                        return (
                          <span className={`font-bold ${total > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {total > 0 ? '+' : ''}{total.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">CFA</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* note */}
        {inventory.note && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Note : </span>{inventory.note}
          </div>
        )}

        {/* ─── document signé ───────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Document signé</p>

          {inventory.file_path ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={inventory.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-blue-600 hover:underline"
                >
                  {inventory.file_name ?? 'Document'}
                </a>
                <p className="text-xs text-gray-400">Cliquez pour ouvrir</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Remplacer
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="sr-only" onChange={e => void handleFileUpload(e)} disabled={uploading} />
              </label>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              {uploading
                ? <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                : <Upload className="h-6 w-6 text-gray-400" />}
              <span className="text-sm text-gray-500">
                {uploading ? 'Envoi en cours…' : 'Cliquez pour uploader le document signé'}
              </span>
              <span className="text-xs text-gray-400">JPG, PNG, WEBP ou PDF · max 10 Mo</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="sr-only" onChange={e => void handleFileUpload(e)} disabled={uploading} />
            </label>
          )}

          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}
        </div>

      </div>
    </div>
  )
}
