import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, Loader2, Lock, LockOpen, Pencil, Plus, Trash2, Wallet,
} from 'lucide-react'
import { deleteCashRegister, fetchCashRegisters } from '../../api/cashRegisters'
import { fetchCashRegisterSessions } from '../../api/cashRegisterSessions'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegister, CashRegisterSession } from '../../types/api'
import { CashRegisterCreateModal } from './create'
import { OpenSessionModal, CloseSessionModal } from './SessionModals'

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsedLabel(openedAt: string) {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m} min`
}

function fmtMoney(v: number) {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' CFA'
}

// ── Carte caisse ──────────────────────────────────────────────────────────────

function RegisterCard({
  register,
  openSession,
  onEdit,
  onDelete,
  onOpenSession,
  onCloseSession,
  onView,
}: {
  register: CashRegister
  openSession: CashRegisterSession | null
  onEdit: () => void
  onDelete: () => void
  onOpenSession: () => void
  onCloseSession: (s: CashRegisterSession) => void
  onView: () => void
}) {
  const isActive = register.status === 'active'
  const isOpen = openSession !== null

  return (
    <div className={`flex flex-col rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md
      ${isOpen ? 'border-emerald-200' : 'border-gray-200'}`}>

      {/* Header de la carte */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold
              ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            {isOpen && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Session ouverte
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900 truncate">{register.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{register.store?.name ?? '—'}</p>
        </div>
        <div className="ml-3 flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF]">
          <Wallet className="h-5 w-5 text-[#0F2E4A]" />
        </div>
      </div>

      {/* Section session */}
      <div className="mx-5 mb-4 rounded-xl border p-4
        ${isOpen ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 bg-gray-50'}">
        {isOpen && openSession ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Ouverture</span>
              <span className="text-xs font-medium text-emerald-700">il y a {elapsedLabel(openSession.opened_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Solde ouverture</span>
              <span className="text-sm font-semibold text-gray-900">{fmtMoney(openSession.opening_balance)}</span>
            </div>
            <button
              type="button"
              onClick={() => onCloseSession(openSession)}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-4 w-4" />
              Fermer la session
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Aucune session active</p>
            <button
              type="button"
              onClick={onOpenSession}
              disabled={!isActive}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LockOpen className="h-4 w-4" />
              Ouvrir une session
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-5 py-3">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Détail
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function CashRegistersIndex() {
  const navigate = useNavigate()

  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [openSessions, setOpenSessions] = useState<Record<number, CashRegisterSession | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [editModal, setEditModal] = useState<CashRegister | null | 'new'>()
  const [openSessionFor, setOpenSessionFor] = useState<CashRegister | null>(null)
  const [closeSessionFor, setCloseSessionFor] = useState<{ register: CashRegister; session: CashRegisterSession } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCashRegisters(1)
      const list = res.data
      setRegisters(list)

      // Utilise open_session envoyé par le backend (eager-loaded)
      const sessionMap: Record<number, CashRegisterSession | null> = {}
      list.forEach(r => {
        sessionMap[r.id] = r.open_session ?? null
      })
      setOpenSessions(sessionMap)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleDelete(r: CashRegister) {
    if (!window.confirm(`Supprimer la caisse « ${r.name} » ?`)) return
    try {
      await deleteCashRegister(r.id)
      setRegisters(prev => prev.filter(x => x.id !== r.id))
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  // Recharger les sessions d'une caisse après ouverture/fermeture
  async function refreshSessions(registerId: number) {
    try {
      const sessions = await fetchCashRegisterSessions(registerId)
      const open = sessions.find(s => s.status === 'open') ?? null
      setOpenSessions(prev => ({ ...prev, [registerId]: open }))
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F2E4A] shadow-sm">
              <Wallet className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-semibold text-gray-900">Caisses</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Ouvrez et fermez vos sessions de caisse, suivez les écarts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditModal('new')}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle caisse
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : registers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 py-16 text-gray-400">
          <Wallet className="h-10 w-10" />
          <p>Aucune caisse configurée.</p>
          <button
            type="button"
            onClick={() => setEditModal('new')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Créer la première caisse →
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {registers.map(register => (
            <RegisterCard
              key={register.id}
              register={register}
              openSession={openSessions[register.id] ?? null}
              onView={() => navigate(`/cash-registers/${register.id}`)}
              onEdit={() => setEditModal(register)}
              onDelete={() => void handleDelete(register)}
              onOpenSession={() => setOpenSessionFor(register)}
              onCloseSession={session => setCloseSessionFor({ register, session })}
            />
          ))}
        </div>
      )}

      {/* Modal création/édition caisse */}
      <CashRegisterCreateModal
        open={editModal !== undefined}
        cashRegister={editModal === 'new' || editModal === undefined ? null : editModal}
        onClose={() => setEditModal(undefined)}
        onSaved={() => { void load(); setEditModal(undefined) }}
      />

      {/* Modal ouverture session */}
      {openSessionFor && (
        <OpenSessionModal
          cashRegisterId={openSessionFor.id}
          cashRegisterName={openSessionFor.name}
          onClose={() => setOpenSessionFor(null)}
          onOpened={session => {
            setOpenSessions(prev => ({ ...prev, [openSessionFor.id]: session }))
            setOpenSessionFor(null)
          }}
        />
      )}

      {/* Modal fermeture session */}
      {closeSessionFor && (
        <CloseSessionModal
          session={closeSessionFor.session}
          cashRegisterId={closeSessionFor.register.id}
          cashRegisterName={closeSessionFor.register.name}
          onClose={() => setCloseSessionFor(null)}
          onClosed={_updated => {
            void refreshSessions(closeSessionFor.register.id)
            setCloseSessionFor(null)
          }}
        />
      )}
    </div>
  )
}
