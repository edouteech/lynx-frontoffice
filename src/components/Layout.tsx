import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../contexts/useAuth'

export default function Layout({ children }: { children: ReactNode }) {
  const { logout, activeOrganizationId } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  return (
    <div className="flex w-full min-h-screen bg-[#EFF6FF]">
      {/* Sidebar - Desktop always visible, Mobile toggleable */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onLogoutClick={() => setShowLogoutConfirm(true)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:ml-64 bg-[#EFF6FF]">
        <Navbar 
          onLogoutClick={() => setShowLogoutConfirm(true)} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <main 
          key={activeOrganizationId ?? 'sans-entreprise'}
          className="flex-1 w-full px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} Lynx — Système de gestion intelligent
            </div>
            <div className="flex gap-6 text-sm font-medium text-gray-400">
              <a href="#" className="hover:text-gray-600 transition-colors">Documentation</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Confirmer la déconnexion
            </h3>
            <p className="mb-6 text-gray-600">
              Votre session sur le serveur sera fermée.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-2 text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
              >
                {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
