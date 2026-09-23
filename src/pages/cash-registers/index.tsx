import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CircleSlash, Eye, Lock, LockOpen, Pencil, Plus, Power, PowerOff, Wallet,
} from 'lucide-react'
import DataTable, { type Column } from '../../components/DataTable'
import {
  fetchCashRegisters, toggleCashRegisterStatus, updateCashRegister,
} from '../../api/cashRegisters'
import { fetchCashRegisterSessions } from '../../api/cashRegisterSessions'
import { fetchStores } from '../../api/stores'
import { getApiErrorMessage } from '../../lib/apiError'
import type { CashRegister, CashRegisterSession, Paginated, Store } from '../../types/api'
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

// ── Page principale ───────────────────────────────────────────────────────────

export default function CashRegistersIndex() {
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [paginated, setPaginated] = useState<Paginated<CashRegister> | null>(null)
  const [registers, setRegisters] = useState<CashRegister[]>([])
  const [openSessions, setOpenSessions] = useState<Record<number, CashRegisterSession | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [stores, setStores] = useState<Store[]>([])
  const [storeFilter, setStoreFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Modals
  const [editModal, setEditModal] = useState<CashRegister | null | 'new'>()
  const [openSessionFor, setOpenSessionFor] = useState<CashRegister | null>(null)
  const [closeSessionFor, setCloseSessionFor] = useState<{ register: CashRegister; session: CashRegisterSession } | null>(null)

  // Charger les magasins pour le filtre
  useEffect(() => {
    fetchStores(1).then(r => setStores(r.data)).catch(console.error)
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, storeFilter, statusFilter])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCashRegisters(
        page,
        statusFilter || undefined,
        storeFilter || undefined,
        false,
        debouncedSearch || undefined
      )
      setPaginated(res)
      setRegisters(res.data)

      const sessionMap: Record<number, CashRegisterSession | null> = {}
      res.data.forEach(r => {
        sessionMap[r.id] = r.open_session ?? null
      })
      setOpenSessions(sessionMap)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, storeFilter, debouncedSearch])

  useEffect(() => { void load() }, [load])

  async function handleToggleStatus(r: CashRegister) {
    const action = r.status === 'active' ? 'désactiver' : 'activer'
    if (!window.confirm(`Voulez-vous ${action} la caisse « ${r.name} » ?`)) return
    try {
      const updated = await toggleCashRegisterStatus(r.id, r.status)
      setRegisters(prev => prev.map(x => x.id === updated.id ? updated : x))
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  async function handleToggleAvailability(r: CashRegister) {
    try {
      const updated = await updateCashRegister(r.id, { is_available: !r.is_available })
      setRegisters(prev => prev.map(x => x.id === updated.id ? updated : x))
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  async function refreshSessions(registerId: number) {
    try {
      const sessions = await fetchCashRegisterSessions(registerId)
      const open = sessions.find(s => s.status === 'open') ?? null
      setOpenSessions(prev => ({ ...prev, [registerId]: open }))
    } catch { /* silent */ }
  }

  const columns: Column<CashRegister>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Caisse',
      sortable: true,
      render: (_, r) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/cash-registers/${r.id}`)}
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
          >
            {r.name}
          </button>
          {r.reference && (
            <p className="text-xs font-mono text-gray-400">Réf: {r.reference}</p>
          )}
        </div>
      ),
    },
    {
      key: 'store.name',
      label: 'Magasin',
      sortable: true,
      render: (_, r) => (
        <span className="text-gray-700 font-medium">{r.store?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (v) => {
        const isActive = v === 'active'
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
    {
      key: 'is_available',
      label: 'Disponibilité',
      sortable: true,
      render: (v) => {
        const isAvail = Boolean(v)
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isAvail ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isAvail ? 'bg-green-500' : 'bg-orange-500'}`} />
            {isAvail ? 'Disponible' : 'Occupée'}
          </span>
        )
      },
    },
    {
      key: 'session',
      label: 'Session',
      render: (_, r) => {
        const openSession = openSessions[r.id] ?? r.open_session ?? null
        const isOpen = openSession !== null
        const isActive = r.status === 'active'

        if (isOpen && openSession) {
          return (
            <div className="flex items-center gap-3">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ouverte ({elapsedLabel(openSession.opened_at)})
                </span>
                <p className="text-xs text-gray-500">Solde : {fmtMoney(openSession.opening_balance)}</p>
              </div>
              <button
                type="button"
                onClick={() => setCloseSessionFor({ register: r, session: openSession })}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                title="Fermer la session"
              >
                <Lock className="h-3.5 w-3.5 text-gray-500" />
                Fermer
              </button>
            </div>
          )
        }

        return (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Aucune session</span>
            <button
              type="button"
              onClick={() => setOpenSessionFor(r)}
              disabled={!isActive}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={isActive ? 'Ouvrir une session' : 'Activez la caisse pour ouvrir une session'}
            >
              <LockOpen className="h-3.5 w-3.5" />
              Ouvrir
            </button>
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      nowrap: true,
      render: (_, r) => {
        const isActive = r.status === 'active'
        const isAvailable = r.is_available
        return (
          <div className="flex items-center justify-end gap-2.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => navigate(`/cash-registers/${r.id}`)}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
              title="Détail"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditModal(r)}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleToggleAvailability(r)}
              className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                isAvailable
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={isAvailable ? 'Occuper' : 'Libérer'}
            >
              <CircleSlash className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleToggleStatus(r)}
              className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                isActive
                  ? 'text-amber-600 hover:bg-amber-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={isActive ? 'Désactiver' : 'Activer'}
            >
              {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </button>
          </div>
        )
      },
    },
  ], [navigate, openSessions])

  const customFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={storeFilter}
        onChange={(e) => setStoreFilter(e.target.value)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 focus:border-[#3B82F6] focus:outline-none"
      >
        <option value="">Tous les magasins</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 focus:border-[#3B82F6] focus:outline-none"
      >
        <option value="">Tous les statuts</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  )

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
            Gérez vos caisses, ouvrez/fermez les sessions et suivez les écarts.
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

      <DataTable
        data={registers}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Rechercher une caisse (nom, référence, magasin)..."
        onSearch={(q) => setSearch(q)}
        customFilters={customFilters}
        exportFilename="caisses"
        printable={true}
        emptyMessage="Aucune caisse trouvée."
        serverPagination={{
          currentPage: paginated?.current_page ?? 1,
          lastPage: paginated?.last_page ?? 1,
          total: paginated?.total ?? 0,
          onPageChange: setPage,
        }}
      />

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
            void load()
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
            void load()
          }}
        />
      )}
    </div>
  )
}

