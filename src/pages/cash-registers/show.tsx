import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ChevronUp, Loader2,
  Lock, LockOpen, Pencil, Plus, Power, PowerOff,
} from 'lucide-react'
import { fetchCashRegister, toggleCashRegisterStatus } from '../../api/cashRegisters'
import { fetchCashRegisterSessions } from '../../api/cashRegisterSessions'
import { fetchStore } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegister, CashRegisterSession } from '../../types/api'
import { CashRegisterCreateModal } from './create'
import { OpenSessionModal, CloseSessionModal } from './SessionModals'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statutPill(statut: string) {
  const s = (statut || '').toLowerCase()
  if (s === 'active')   return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  if (s === 'inactive') return 'border border-slate-200 bg-slate-100 text-slate-700'
  return 'border border-gray-200 bg-gray-100 text-gray-700'
}

function sessionStatusPill(status: CashRegisterSession['status']) {
  return status === 'open'
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-gray-100 text-gray-600 border border-gray-200'
}

function fmtMoney(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' CFA'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Ligne de session ──────────────────────────────────────────────────────────

function SessionRow({
  session,
  onCloseRequest,
}: {
  session: CashRegisterSession
  onCloseRequest: () => void
}) {
  const [expanded, setExpanded] = useState(session.status === 'open')
  const isOpen = session.status === 'open'

  return (
    <div className={`overflow-hidden rounded-xl border transition-all
      ${isOpen ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sessionStatusPill(session.status)}`}>
            {isOpen ? 'Ouverte' : 'Fermée'}
          </span>
          <span className="text-sm font-medium text-gray-900">
            Ouverture : {fmtDate(session.opened_at)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onCloseRequest() }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-3.5 w-3.5" />
              Fermer
            </button>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Solde ouverture</p>
              <p className="mt-0.5 font-semibold text-gray-900">{fmtMoney(session.opening_balance)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ventes encaissées</p>
              <p className="mt-0.5 font-semibold text-blue-700">
                {session.sales_total != null ? fmtMoney(session.sales_total) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Solde attendu</p>
              <p className="mt-0.5 font-semibold text-gray-900">
                {session.expected_closing_balance != null ? fmtMoney(session.expected_closing_balance) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Solde réel</p>
              <p className="mt-0.5 font-semibold text-gray-900">
                {session.closing_balance !== null && session.closing_balance != null
                  ? fmtMoney(session.closing_balance)
                  : <span className="text-gray-400">—</span>}
              </p>
            </div>
            {session.difference != null && (
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-xs text-gray-500">Écart de caisse</p>
                <p className={`mt-0.5 font-bold
                  ${Math.abs(session.difference) < 1 ? 'text-gray-600'
                    : session.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {session.difference >= 0 ? '+' : ''}{fmtMoney(session.difference)}
                </p>
              </div>
            )}
          </div>

          {session.closed_at && (
            <p className="mt-3 text-xs text-gray-500">Fermée le {fmtDate(session.closed_at)}</p>
          )}
          {session.note && (
            <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 italic">{session.note}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CashRegisterShow() {
  const { id } = useParams<{ id: string }>()

  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [sessions, setSessions] = useState<CashRegisterSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [openModalVisible, setOpenModalVisible] = useState(false)
  const [closeModalSession, setCloseModalSession] = useState<CashRegisterSession | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)

  const openSession = sessions.find(s => s.status === 'open') ?? null

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setStoreName(null)
    try {
      const c = await fetchCashRegister(id)
      setCashRegister(c)
      try {
        const m = await fetchStore(c.store_id)
        setStoreName(m.name)
      } catch { setStoreName(null) }
    } catch (e) {
      setError(getApiErrorMessage(e))
      setCashRegister(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadSessions = useCallback(async () => {
    if (!id) return
    setSessionsLoading(true)
    try {
      const s = await fetchCashRegisterSessions(id)
      setSessions(s)
    } catch { /* silent */ }
    finally { setSessionsLoading(false) }
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadSessions() }, [loadSessions])

  async function handleToggleStatus() {
    if (!cashRegister) return
    const action = cashRegister.status === 'active' ? 'désactiver' : 'activer'
    if (!window.confirm(`Voulez-vous ${action} la caisse « ${cashRegister.name} » ?`)) return
    setToggling(true)
    setError(null)
    try {
      const updated = await toggleCashRegisterStatus(cashRegister.id, cashRegister.status)
      setCashRegister(updated)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !cashRegister) {
    return (
      <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Link to="/cash-registers"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]">
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      </div>
    )
  }

  if (!cashRegister) return null

  return (
    <div className="min-h-screen flex-1 bg-[#EFF6FF] px-6 py-8 lg:px-10 lg:py-10">
      <div className="w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/cash-registers"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <button type="button" onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50">
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              disabled={toggling}
              onClick={() => void handleToggleStatus()}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 transition-colors
                ${cashRegister.status === 'active'
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              {cashRegister.status === 'active'
                ? <><PowerOff className="h-4 w-4" />{toggling ? 'Désactivation…' : 'Désactiver'}</>
                : <><Power className="h-4 w-4" />{toggling ? 'Activation…' : 'Activer'}</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</div>
        )}

        {/* Infos caisse */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Caisse</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statutPill(cashRegister.status)}`}>
              {cashRegister.status}
            </span>
            {openSession && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Session ouverte
              </span>
            )}
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{cashRegister.name}</h1>

          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm font-medium text-gray-500">Magasin</dt>
              <dd className="text-sm font-medium text-gray-900">{storeName ?? 'Chargement…'}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end sm:gap-8 text-sm">
            <div className="sm:text-right">
              <div className="text-gray-500">Créée le</div>
              <div className="text-gray-800">
                {new Date(cashRegister.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-gray-500">Dernière mise à jour</div>
              <div className="text-gray-800">
                {new Date(cashRegister.updated_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sessions ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Sessions de caisse</h2>
            <button
              type="button"
              disabled={!!openSession}
              onClick={() => setOpenModalVisible(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title={openSession ? 'Une session est déjà ouverte' : 'Ouvrir une nouvelle session'}
            >
              <Plus className="h-4 w-4" />
              Ouvrir une session
            </button>
          </div>

          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-10 text-gray-400">
              <LockOpen className="h-8 w-8" />
              <p className="text-sm">Aucune session pour cette caisse.</p>
              <button
                type="button"
                onClick={() => setOpenModalVisible(true)}
                className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Ouvrir la première session →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onCloseRequest={() => setCloseModalSession(session)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CashRegisterCreateModal
        open={modalOpen}
        cashRegister={cashRegister}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />

      {openModalVisible && (
        <OpenSessionModal
          cashRegisterId={cashRegister.id}
          cashRegisterName={cashRegister.name}
          onClose={() => setOpenModalVisible(false)}
          onOpened={session => {
            setSessions(prev => [session, ...prev])
            setOpenModalVisible(false)
          }}
        />
      )}

      {closeModalSession && (
        <CloseSessionModal
          session={closeModalSession}
          cashRegisterId={cashRegister.id}
          cashRegisterName={cashRegister.name}
          onClose={() => setCloseModalSession(null)}
          onClosed={updated => {
            setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
            setCloseModalSession(null)
          }}
        />
      )}
    </div>
  )
}
