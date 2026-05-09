import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  Menu,
  ChevronDown,
  Plus,
  Package,
  ShoppingBag,
  Truck,
  Building,
  Shield,
} from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { userDisplayName, userInitials } from '../lib/userDisplay'
import { displayRoleName } from '../lib/ownerRole'

interface NavbarProps {
  onLogoutClick: () => void
  onMenuClick?: () => void
}

export default function Navbar({ onLogoutClick, onMenuClick }: NavbarProps) {
  const { user, activeOrganizationId, setActiveOrganizationId, currentOrganization } = useAuth()
  const currentMembership = user?.organization_memberships?.find(
    (m) => m.organization_id === activeOrganizationId
  )
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showOrgMenu, setShowOrgMenu] = useState(false)

  // Removed breadcrumbs logic as per user request

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md transition-all duration-300 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Organization Switcher (Context) */}
        <div className="hidden items-center gap-3 lg:flex">
          <span className="text-sm font-bold text-gray-500">VOUS ETES DANS L'ENTREPRISE </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 transition-all hover:border-blue-300 hover:bg-blue-50/30 active:scale-95"
            >
              <Building className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-900">
                {currentOrganization?.name || 'Sélectionner...'}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showOrgMenu ? 'rotate-180' : ''}`} />
            </button>

            {showOrgMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowOrgMenu(false)}
                ></div>
                <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-20">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Mes Entreprises
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {user?.organization_memberships?.map((membership) => (
                      <button
                        key={membership.organization_id}
                        onClick={() => {
                          setActiveOrganizationId(membership.organization_id)
                          setShowOrgMenu(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          activeOrganizationId === membership.organization_id
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            activeOrganizationId === membership.organization_id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Building className="h-4 w-4" />
                          </div>
                          <span className="truncate max-w-[160px]">{membership.organization?.name}</span>
                        </div>
                        {activeOrganizationId === membership.organization_id && (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div className="my-1 h-px bg-gray-100"></div>
                  
                  <button
                    onClick={() => {
                      navigate('/userprofile')
                      setShowOrgMenu(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Gérer les entreprises
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Title */}
        <h1 className="text-lg font-bold text-gray-900 lg:hidden">
          {currentOrganization?.name || 'Lynx'}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">

        {/* Quick Create */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nouveau
          </button>

          {showCreateMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowCreateMenu(false)}
              ></div>
              <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-20">
                <button
                  onClick={() => {
                    navigate('/items/create')
                    setShowCreateMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Package className="h-4 w-4 text-gray-400" />
                  Nouvel article
                </button>
                <button
                  onClick={() => {
                    navigate('/sales/create')
                    setShowCreateMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ShoppingBag className="h-4 w-4 text-gray-400" />
                  Nouvelle vente
                </button>
                <button
                  onClick={() => {
                    navigate('/purchase-orders/create')
                    setShowCreateMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Truck className="h-4 w-4 text-gray-400" />
                  Commande fournisseur
                </button>
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="h-8 w-px bg-gray-200 mx-1 md:mx-2"></div>

        {/* User Role Badge */}
        <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 lg:flex">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {displayRoleName(currentMembership?.role?.name)}
          </span>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-xl p-1.5 transition-all hover:bg-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-white md:h-10 md:w-10 md:text-sm">
              {userInitials(user)}
            </div>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-semibold text-gray-900 leading-none">
                {userDisplayName(user)}
              </span>
              <span className="mt-1 text-xs text-gray-500 leading-none">
                {user?.email}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-20">
                <div className="px-3 py-2 md:hidden">
                   <p className="text-sm font-semibold text-gray-900">{userDisplayName(user)}</p>
                   <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="h-px bg-gray-100 my-1 md:hidden"></div>
                <button
                  onClick={() => {
                    navigate('/userprofile')
                    setShowUserMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <User className="h-4 w-4" />
                  Mon profil
                </button>
                <button
                  onClick={() => {
                    navigate('/settings/general')
                    setShowUserMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <Settings className="h-4 w-4" />
                  Paramètres
                </button>
                <div className="my-1 h-px bg-gray-100"></div>
                <button
                  onClick={() => {
                    onLogoutClick()
                    setShowUserMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
