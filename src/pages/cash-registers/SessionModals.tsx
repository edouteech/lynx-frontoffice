import { useState } from 'react'
import { Loader2, Lock, LockOpen, X } from 'lucide-react'
import {
  openCashRegisterSession,
  closeCashRegisterSession,
} from '../../api/cashRegisterSessions'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegisterSession } from '../../types/api'

function fmtMoney(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' CFA'
}

// ── Modal d'ouverture ─────────────────────────────────────────────────────────

export function OpenSessionModal({
  cashRegisterId,
  cashRegisterName,
  onClose,
  onOpened,
}: {
  cashRegisterId: number
  cashRegisterName?: string
  onClose: () => void
  onOpened: (s: CashRegisterSession) => void
}) {
  const [balance, setBalance] = useState('0')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const val = parseFloat(balance)
    if (isNaN(val) || val < 0) { setError('Solde invalide.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const session = await openCashRegisterSession(cashRegisterId, {
        opening_balance: val,
        note: note.trim() || null,
      })
      onOpened(session)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Ouvrir une session</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {cashRegisterName && (
          <p className="mb-4 text-sm text-gray-500">{cashRegisterName}</p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Solde d'ouverture (CFA) <span className="text-red-500">*</span>
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Comptez le montant physiquement présent dans la caisse avant d'ouvrir.
            </p>
            <input
              type="number"
              min="0"
              step="1"
              value={balance}
              autoFocus
              onChange={e => setBalance(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Note (optionnelle)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Observations…"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <LockOpen className="h-4 w-4" />
            Ouvrir la caisse
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de fermeture ────────────────────────────────────────────────────────

export function CloseSessionModal({
  session,
  cashRegisterId,
  cashRegisterName,
  onClose,
  onClosed,
}: {
  session: CashRegisterSession
  cashRegisterId: number
  cashRegisterName?: string
  onClose: () => void
  onClosed: (s: CashRegisterSession) => void
}) {
  const expected = session.expected_closing_balance ?? session.opening_balance
  const [balance, setBalance] = useState(String(Math.round(expected)))
  const [note, setNote] = useState(session.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const val  = parseFloat(balance) || 0
  const diff = val - expected

  async function handleSubmit() {
    if (isNaN(parseFloat(balance)) || parseFloat(balance) < 0) {
      setError('Solde invalide.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const closed = await closeCashRegisterSession(cashRegisterId, session.id, {
        closing_balance: parseFloat(balance),
        note: note.trim() || null,
      })
      onClosed(closed)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Fermer la session</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {cashRegisterName && (
          <p className="mb-4 text-sm text-gray-500">{cashRegisterName}</p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Récap session */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Solde d'ouverture</span>
            <span className="font-medium">{fmtMoney(session.opening_balance)}</span>
          </div>
          {session.sales_total != null && (
            <div className="flex justify-between text-gray-600">
              <span>Ventes encaissées</span>
              <span className="font-medium text-blue-700">+ {fmtMoney(session.sales_total)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Nb. de factures</span>
            <span className="font-medium">{session.invoice_count}</span>
          </div>
          {(session.last_invoice_number ?? session.last_sale_id) != null && (
            <div className="flex justify-between text-gray-600">
              <span>Dernière facture</span>
              <span className="font-mono font-medium">
                {session.last_invoice_number ?? `#${String(session.last_sale_id).padStart(4, '0')}`}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800">
            <span>Solde théorique</span>
            <span>{fmtMoney(expected)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Solde réel en caisse (CFA) <span className="text-red-500">*</span>
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Comptez le montant physiquement présent dans la caisse.
            </p>
            <input
              type="number"
              min="0"
              step="1"
              value={balance}
              autoFocus
              onChange={e => setBalance(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Écart en temps réel */}
          {!isNaN(diff) && (
            <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold
              ${Math.abs(diff) < 1
                ? 'bg-gray-100 text-gray-700'
                : diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              <span>Écart de caisse</span>
              <span>{diff >= 0 ? '+' : ''}{fmtMoney(diff)}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Commentaires, observations…"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2E4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a4068] disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <Lock className="h-4 w-4" />
            Fermer la session
          </button>
        </div>
      </div>
    </div>
  )
}
