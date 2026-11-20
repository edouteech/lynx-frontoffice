import { useState } from 'react'
import Modal from '../../components/Modal'
import type { LineDiscount } from '../../lib/saleCalc'
import type { ReductionLike } from '../../lib/reductions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm placeholder-gray-400 transition focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:bg-gray-50 disabled:text-gray-500'

const toggleClass = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
    active ? 'border-[#3B82F6] bg-[#3B82F6] text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
  }`

const reductionLabel = (r: ReductionLike) =>
  `${r.name} · ${r.type === 'percentage' ? `${r.value} %` : `${Number(r.value).toLocaleString('fr-FR')} CFA`}`

export type LineDiscountChoice =
  | { type: 'manual'; discount: LineDiscount }
  | { type: 'reduction'; reduction: ReductionLike }
  | { type: 'clear' }

/** Remise sur UNE ligne : réduction enregistrée, ou remise manuelle en % ou en montant PAR UNITÉ (comme la caisse). */
export function LineDiscountModal({
  open,
  productName,
  reductions,
  hasDiscount,
  onClose,
  onChoose,
}: {
  open: boolean
  productName: string
  /** Réductions déjà filtrées : actives maintenant et applicables à ce produit. */
  reductions: ReductionLike[]
  hasDiscount: boolean
  onClose: () => void
  onChoose: (choice: LineDiscountChoice) => void
}) {
  const [isPercent, setIsPercent] = useState(false)
  const [value, setValue] = useState('')
  const parsed = parseFloat(value)
  const valid = Number.isFinite(parsed) && parsed > 0 && (!isPercent || parsed <= 100)

  return (
    <Modal open={open} onClose={onClose} title="Remise sur la ligne" subtitle={productName} maxWidthClassName="max-w-md">
      <div className="space-y-4">
        {reductions.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Remises enregistrées</div>
            <div className="flex flex-wrap gap-2">
              {reductions.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onChoose({ type: 'reduction', reduction: r })}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {reductionLabel(r)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Remise manuelle</div>
          <div className="mb-3 flex gap-2">
            <button type="button" className={toggleClass(!isPercent)} onClick={() => setIsPercent(false)}>
              Montant / unité
            </button>
            <button type="button" className={toggleClass(isPercent)} onClick={() => setIsPercent(true)}>
              %
            </button>
          </div>
          <input
            type="number"
            min="0"
            max={isPercent ? 100 : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isPercent ? 'Pourcentage' : 'Montant par unité (CFA)'}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {hasDiscount ? (
            <button
              type="button"
              onClick={() => onChoose({ type: 'clear' })}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Retirer la remise
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!valid}
            onClick={() => onChoose({ type: 'manual', discount: { kind: isPercent ? 'percent' : 'amount', value: parsed } })}
            className="rounded-lg bg-[#3B82F6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
          >
            Appliquer
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Remise globale : % ou montant, réduction enregistrée globale, ou code promo (le nom de la réduction). */
export function GlobalDiscountFields({
  mode,
  percent,
  amount,
  reductions,
  disabled,
  onModeChange,
  onPercentChange,
  onAmountChange,
  onApplyReduction,
  onApplyCode,
}: {
  mode: 'percent' | 'amount'
  percent: string
  amount: string
  /** Réductions actives maintenant (globales et spécifiques). */
  reductions: ReductionLike[]
  disabled: boolean
  onModeChange: (mode: 'percent' | 'amount') => void
  onPercentChange: (value: string) => void
  onAmountChange: (value: string) => void
  onApplyReduction: (reduction: ReductionLike) => string | null
  onApplyCode: (code: string) => string | null
}) {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const run = (fn: () => string | null, okText: string) => {
    const error = fn()
    setMessage(error ? { text: error, ok: false } : { text: okText, ok: true })
    if (!error) setCode('')
  }

  return (
    <div className="w-full space-y-2 sm:w-52">
      <div>
        <div className="mb-1 flex h-7 items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Remise globale</label>
          <div className="flex gap-1">
            <button type="button" disabled={disabled} className={toggleClass(mode === 'percent')} onClick={() => onModeChange('percent')}>
              %
            </button>
            <button type="button" disabled={disabled} className={toggleClass(mode === 'amount')} onClick={() => onModeChange('amount')}>
              Montant
            </button>
          </div>
        </div>
        {mode === 'percent' ? (
          <input
            type="number"
            min="0"
            max="100"
            value={percent}
            onChange={(e) => onPercentChange(e.target.value)}
            disabled={disabled}
            placeholder="0"
            className={inputClass}
          />
        ) : (
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={disabled}
            placeholder="0"
            className={inputClass}
          />
        )}
      </div>

      {reductions.length > 0 && !disabled && (
        <>
          <select
            value=""
            onChange={(e) => {
              const reduction = reductions.find((r) => String(r.id) === e.target.value)
              if (reduction) run(() => onApplyReduction(reduction), `« ${reduction.name} » appliquée`)
            }}
            className={inputClass}
            aria-label="Remise enregistrée"
          >
            <option value="">Remise enregistrée…</option>
            {reductions.map((r) => (
              <option key={r.id} value={r.id}>
                {reductionLabel(r)}
                {r.scope === 'specific' ? ' (produits ciblés)' : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code promo"
              className={inputClass}
            />
            <button
              type="button"
              disabled={!code.trim()}
              onClick={() => run(() => onApplyCode(code), `Code « ${code.trim()} » appliqué`)}
              className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </>
      )}

      {message && <p className={`text-xs ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}
