import { useState } from 'react'
import Modal from '../../components/Modal'

import { extrasUnitPrice } from '../../lib/lineExtras'
import type { ExtraOption, ExtraSupplement, LineExtras } from '../../lib/lineExtras'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20'

export function LineExtrasModal({
  open,
  productName,
  basePrice,
  supplements,
  options,
  initial,
  onClose,
  onApply,
}: {
  open: boolean
  productName: string
  basePrice: number
  supplements: ExtraSupplement[]
  options: ExtraOption[]
  initial: LineExtras
  onClose: () => void
  onApply: (extras: LineExtras) => void
}) {
  const [extras, setExtras] = useState<LineExtras>(initial)
  const price = extrasUnitPrice(basePrice, supplements, extras)

  const setQty = (id: string, qty: number) =>
    setExtras((prev) => {
      const next = { ...prev.supplements }
      if (qty > 0) next[id] = qty
      else delete next[id]
      return { ...prev, supplements: next }
    })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplements.length === 0 && options.length === 0 ? 'Commentaire de la ligne' : 'Personnaliser la ligne'}
      subtitle={productName}
      maxWidthClassName="max-w-md"
    >
      <div className="space-y-5">
        {options.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Option (un seul choix)</div>
            <div className="space-y-1.5">
              {options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="line-option"
                    checked={extras.optionId === o.id}
                    onChange={() => setExtras((prev) => ({ ...prev, optionId: o.id }))}
                  />
                  {o.name}
                </label>
              ))}
              {extras.optionId !== null && (
                <button
                  type="button"
                  onClick={() => setExtras((prev) => ({ ...prev, optionId: null }))}
                  className="text-xs text-gray-500 underline"
                >
                  Aucune option
                </button>
              )}
            </div>
          </div>
        )}

        {supplements.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Suppléments</div>
            <div className="space-y-2">
              {supplements.map((s) => {
                const qty = extras.supplements[s.id] ?? 0
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-800">
                      {s.name}{' '}
                      <span className="text-gray-500">{s.price > 0 ? `+${s.price.toLocaleString('fr-FR')} CFA` : 'Inclus'}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(s.id, qty - 1)}
                        disabled={qty === 0}
                        className="h-7 w-7 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-40"
                        aria-label={`Retirer ${s.name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-semibold">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(s.id, qty + 1)}
                        className="h-7 w-7 rounded-lg border border-gray-300 text-gray-700"
                        aria-label={`Ajouter ${s.name}`}
                      >
                        +
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Commentaire</label>
          <textarea
            value={extras.comment}
            onChange={(e) => setExtras((prev) => ({ ...prev, comment: e.target.value }))}
            maxLength={1000}
            rows={2}
            placeholder="Ex. sans sel"
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600">
            Prix unitaire : <strong className="text-gray-900">{price.toLocaleString('fr-FR')} CFA</strong>
          </span>
          <button
            type="button"
            onClick={() => onApply(extras)}
            className="rounded-lg bg-[#3B82F6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
          >
            Valider
          </button>
        </div>
      </div>
    </Modal>
  )
}
