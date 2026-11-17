import { useEffect, useMemo, useState } from 'react'
import { Building2, Filter, RotateCcw, Store as StoreIcon, Tag } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import { fetchStores } from '../api/stores'
import { fetchPurchasingCenters } from '../api/purchaseOrders'
import type { Store } from '../types/api'
import type { StockListFilters as Filters } from '../lib/stockListFilters'

interface Props {
  statusOptions: { value: string; label: string }[]
  /** Affiche le filtre « Centrale d'achat » (commandes centrale). */
  withCenter?: boolean
  storeLabel?: string
  /** Deux champs séparés « Magasin source » / « Magasin destination » (transferts). */
  separateStores?: boolean
  onApply: (filters: Filters) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

function toLocalValue(d: Date, time = '00:00') {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`
}

// Mise en page selon la LARGEUR DE LA CARTE (container query), pas celle de l'écran : le menu de
// gauche réduit la place disponible. Tout tient sur UNE ligne [période][listes][boutons] seulement
// si chaque liste garde assez de place pour son texte ; sinon on passe sur deux colonnes.
// (Classes écrites en entier : Tailwind ne génère pas de classe construite dynamiquement.)
const LAYOUT: Record<number, { grid: string; buttons: string }> = {
  2: { grid: '@[870px]:grid-cols-[auto_1fr_1fr_auto]', buttons: '@[870px]:col-span-1' },
  3: { grid: '@[1040px]:grid-cols-[auto_1fr_1fr_1fr_auto]', buttons: '@[1040px]:col-span-1' },
}

const selectClass =
  'w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]'

/**
 * Barre de filtres des listes de stock, au même style que les pages de rapports :
 * « Période » (sélecteur de dates), « Magasin », « Statut », puis « Filtrer » / réinitialiser.
 * Par défaut la période est « Tout le temps » : aucun filtre de date n'est envoyé.
 */
export default function StockListFilters({
  statusOptions,
  withCenter = false,
  storeLabel = 'Magasin',
  separateStores = false,
  onApply,
}: Props) {
  const defaultFrom = useMemo(() => toLocalValue(new Date(2020, 0, 1)), [])
  const defaultTo = useMemo(() => toLocalValue(new Date(), '23:59'), [])

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [storeId, setStoreId] = useState('')
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState('')
  const [status, setStatus] = useState('')
  const [centerId, setCenterId] = useState('')

  const [stores, setStores] = useState<Store[]>([])
  const [centers, setCenters] = useState<Store[]>([])

  useEffect(() => {
    let cancelled = false
    fetchStores(1, undefined, false, true)
      .then((res) => { if (!cancelled) setStores(res.data) })
      .catch(() => { if (!cancelled) setStores([]) })
    if (withCenter) {
      fetchPurchasingCenters()
        .then((res) => { if (!cancelled) setCenters(res) })
        .catch(() => { if (!cancelled) setCenters([]) })
    }
    return () => { cancelled = true }
  }, [withCenter])

  // Seule la DATE compte pour la liste (le sélecteur envoie aussi l'heure).
  const dateFromChanged = from.slice(0, 10) !== defaultFrom.slice(0, 10)
  const dateToChanged = to.slice(0, 10) !== defaultTo.slice(0, 10)
  const hasFilters = dateFromChanged || dateToChanged || storeId !== '' || fromStoreId !== '' || toStoreId !== '' || status !== '' || centerId !== ''

  const apply = () => {
    onApply({
      dateFrom: dateFromChanged ? from.slice(0, 10) : undefined,
      dateTo: dateToChanged ? to.slice(0, 10) : undefined,
      storeId: storeId ? Number(storeId) : undefined,
      fromStoreId: fromStoreId ? Number(fromStoreId) : undefined,
      toStoreId: toStoreId ? Number(toStoreId) : undefined,
      status: status || undefined,
      centerId: centerId ? Number(centerId) : undefined,
    })
  }

  const reset = () => {
    setFrom(defaultFrom)
    setTo(defaultTo)
    setStoreId('')
    setFromStoreId('')
    setToStoreId('')
    setStatus('')
    setCenterId('')
    onApply({})
  }

  const selectCount = (separateStores ? 2 : 1) + (withCenter ? 1 : 0) + 1

  const layout = LAYOUT[selectCount] ?? LAYOUT[3]

  return (
    <div className="@container rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`grid grid-cols-1 items-end gap-4 @[560px]:grid-cols-2 ${layout.grid}`}>
        {/* Colonne « auto » : la période prend la largeur de son texte, sans déborder sur la liste suivante. */}
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold text-gray-600">Période</div>
          <DateRangePicker
            from={from}
            to={to}
            onRangeChange={(f, t) => {
              setFrom(f)
              setTo(t)
            }}
          />
        </div>

        {withCenter && (
          <label className="min-w-0">
            <div className="mb-1 text-xs font-semibold text-gray-600">Centrale d'achat</div>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select value={centerId} onChange={(e) => setCenterId(e.target.value)} className={selectClass}>
                <option value="">Toutes les centrales</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}

        {separateStores ? (
          <>
            <label className="min-w-0">
              <div className="mb-1 text-xs font-semibold text-gray-600">Magasin source</div>
              <div className="relative">
                <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select value={fromStoreId} onChange={(e) => setFromStoreId(e.target.value)} className={selectClass}>
                  <option value="">Tous les magasins</option>
                  {/* Un transfert ne peut pas aller d'un magasin vers lui-même : la destination choisie est grisée. */}
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} disabled={String(s.id) === toStoreId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="min-w-0">
              <div className="mb-1 text-xs font-semibold text-gray-600">Magasin destination</div>
              <div className="relative">
                <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select value={toStoreId} onChange={(e) => setToStoreId(e.target.value)} className={selectClass}>
                  <option value="">Tous les magasins</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} disabled={String(s.id) === fromStoreId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </>
        ) : (
          <label className="min-w-0">
            <div className="mb-1 text-xs font-semibold text-gray-600">{storeLabel}</div>
            <div className="relative">
              <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={selectClass}>
                <option value="">Tous les magasins</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
        )}

        <label className="min-w-0">
          <div className="mb-1 text-xs font-semibold text-gray-600">Statut</div>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="">Tous les statuts</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className={`flex gap-2 @[560px]:col-span-2 ${layout.buttons}`}>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              title="Réinitialiser les filtres"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#3B82F6]/20 transition-all hover:bg-[#2563EB] active:scale-95"
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>
        </div>
      </div>
    </div>
  )
}
