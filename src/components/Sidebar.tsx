import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  FolderTree,
  Package,
  UserRoundPlus,
  Wallet,
  Percent,
  Tag,
  Banknote,
  Settings,
  SlidersHorizontal,
  ReceiptText,
  Crown,
  Shield,
  Users,
  UserRound,
  ChevronDown,
  ChevronRight,
  List,
  Star,
  Boxes,
  Truck,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  PackagePlus,
  ShoppingBag,
  BarChart3,
  LineChart,
  CreditCard,
  Clock,
  Undo2,
  TrendingUp,
  History,
  PieChart,
  Printer,
  Trash2,
  Settings2,
  Globe,
} from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useGeneralSetting } from '../contexts/useGeneralSetting'
import { resolveBackendUrl } from '../lib/url'
import { hasPermissionCode } from '../lib/permissions'
import { useEffect, useState, type ComponentType } from 'react'

interface NavSubItem {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
}

interface NavItem {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  children?: NavSubItem[]
}

const navItems: NavItem[] = [
  {
    id: 'dashboard-menu',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    children: [
      { id: 'rapports/synthese-globale', label: 'Synthèse globale', icon: LineChart },
      { id: 'rapports/resume-detaille', label: 'Synthèse détaillé', icon: TrendingUp },
      { id: 'stock/evaluation?type=dashboard', label: 'Stock global', icon: PieChart },
    ],
  },
  {
    id: 'rapports-menu',
    label: 'Rapports',
    icon: BarChart3,
    children: [
      { id: 'rapports/ventes', label: 'Récap ventes', icon: LineChart },
      {
        id: 'rapports/ventes-par-articles',
        label: 'Ventes par articles',
        icon: Package,
      },
      {
        id: 'rapports/ventes-par-employe',
        label: 'Ventes par employé',
        icon: Users,
      },
      {
        id: 'rapports/ventes-par-categorie',
        label: 'Ventes par catégorie',
        icon: FolderTree,
      },
      {
        id: 'rapports/ventes-par-moyen-de-paiement',
        label: 'Moyens de paiement',
        icon: CreditCard,
      },
      {
        id: 'rapports/ventes-par-taxe',
        label: 'Ventes par taxe',
        icon: Percent,
      },
      {
        id: 'rapports/factures-des-ventes',
        label: 'Facture des ventes',
        icon: ReceiptText,
      },
      {
        id: 'rapports/rachats-d-article',
        label: "Rachats d'article",
        icon: Undo2,
      },
      {
        id: 'rapports/periode-de-travail',
        label: 'Période de travail',
        icon: Clock,
      },
    ],
  },
  {
    id: 'articles-menu',
    label: 'Articles',
    icon: Package,
    children: [
      { id: 'items', label: 'Liste des articles', icon: List },
      { id: 'item-categories', label: 'Catégories', icon: FolderTree },
      { id: 'discounts', label: 'Réductions', icon: Tag },
      { id: 'favorites', label: 'Favoris', icon: Star },
      { id: 'options', label: 'Options', icon: Settings2 },
    ],
  },
  {
    id: 'stock-menu',
    label: 'Stock',
    icon: Boxes,
    children: [
      { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
      { id: 'central-orders', label: 'Commandes centrale', icon: Store },
      { id: 'purchase-orders', label: 'Commandes fournisseur', icon: ClipboardList },
      { id: 'stock-transfers', label: 'Transferts', icon: ArrowLeftRight },
      { id: 'stock-adjustments', label: 'Ajustements', icon: PackagePlus },
      { id: 'stock/evaluation?type=stock', label: 'Évaluation de stock', icon: BarChart3 },
      { id: 'stock/movements',  label: 'Historique des stocks', icon: History },
      { id: 'inventories', label: 'Inventaires', icon: ClipboardCheck },
    ],
  },
  {
    id: 'ventes-clients-menu',
    label: 'Ventes & Clients',
    icon: ReceiptText,
    children: [
      { id: 'sales', label: 'Ventes', icon: ReceiptText },
      { id: 'customers', label: 'Clients', icon: UserRoundPlus },
    ],
  },
  {
    id: 'ventes-menu',
    label: 'Point de vente',
    icon: ShoppingBag,
    children: [
      { id: 'stores', label: 'Magasins', icon: Store },
      { id: 'cash-registers', label: 'Caisses', icon: Wallet },
      { id: 'vat-rates', label: 'TVA', icon: Percent },
      { id: 'payment-methods', label: 'Moyens de paiement', icon: Banknote },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe',
    icon: Users,
    children: [
      { id: 'roles', label: 'Rôles', icon: Shield },
      { id: 'users', label: 'Utilisateurs', icon: UserRound },
    ],
  },
  {
    id: 'parametres-menu',
    label: 'Paramètres',
    icon: Settings,
    children: [
      {
        id: 'settings/general',
        label: 'Générale',
        icon: SlidersHorizontal,
      },
      {
        id: 'settings/receipts',
        label: 'Reçus',
        icon: ReceiptText,
      },
      {
        id: 'settings/restaurant-options',
        label: 'Options restauration',
        icon: ClipboardList,
      },
      {
        id: 'settings/kitchen-printers',
        label: 'Imprimantes cuisine',
        icon: Printer,
      },
      {
        id: 'settings/public-links',
        label: 'Liens publics',
        icon: Globe,
      },
      {
        id: 'settings/subscription',
        label: 'Licences',
        icon: Crown,
      },
    ],
  },
  {
    id: 'trash-menu',
    label: 'Corbeille',
    icon: Trash2,
    children: [
      { id: 'trash/stores', label: 'Magasins', icon: Store },
      { id: 'trash/items', label: 'Articles', icon: Package },
      { id: 'trash/item-categories', label: 'Catégories', icon: FolderTree },
      { id: 'trash/cash-registers', label: 'Caisses', icon: Wallet },
      { id: 'trash/payment-methods', label: 'Moyens de paiement', icon: Banknote },
      { id: 'trash/customers', label: 'Clients', icon: UserRoundPlus },
      { id: 'trash/vat-rates', label: 'TVA', icon: Percent },
    ],
  },
]

export default function Sidebar(_props: { onLogoutClick?: () => void }) {
  const {
    user,
    currentOrganization,
    activeOrganizationId,
  } = useAuth()
  const { generalSetting } = useGeneralSetting()
  const location = useLocation()
  const navigate = useNavigate()
  const pathWithoutSlash = location.pathname.replace(/^\//, '')
  const canSeeDashboard = hasPermissionCode(user, activeOrganizationId, 'admin_panel.dashboard.view')
  
  const activeTab = pathWithoutSlash === 'dashboard'
    ? (canSeeDashboard ? 'rapports/synthese-globale' : 'rapports/ventes')
    : (pathWithoutSlash + location.search)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  // Auto-expand active section on route change
  useEffect(() => {
    const activeSection = navItems.find((item) =>
      item.children?.some(
        (child) => activeTab === child.id || activeTab.startsWith(`${child.id}/`)
      )
    )
    if (activeSection) {
      setOpenSections({ [activeSection.id]: true })
    }
  }, [activeTab])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => (prev[id] ? {} : { [id]: true }))
  }


  const navItemsFiltered = navItems.filter((item) => {
    // Tableau de bord
    if (item.id === 'dashboard-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.dashboard.view')
    }

    // Rapport
    if (item.id === 'rapports-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.reports.view')
    }

    // Articles
    if (item.id === 'articles-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.items.manage')
    }

    // Stock
    if (item.id === 'stock-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.stock.manage')
    }

    // Ventes + Clients (sortis du groupe "Point de vente", regroupés ensemble) —
    // visible avec l'une de ces permissions, exactement la même logique que
    // SaleController::authorizeBackofficeSale() côté API. Clients réutilise cette
    // même permission plutôt que d'en avoir une dédiée :
    //   - admin_panel.stores.manage : droit large historique
    //   - admin_panel.sales.manage  : permission fine dédiée au menu Ventes (nouvelle,
    //     ajoutée en même temps que la sortie du groupe "Point de vente")
    //   - cash_register.sales.create_from_backoffice : permission historique côté caisse
    if (item.id === 'ventes-clients-menu') {
      return (
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.stores.manage') ||
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.sales.manage') ||
        hasPermissionCode(user, activeOrganizationId, 'cash_register.sales.create_from_backoffice')
      )
    }

    // Point de vente
    if (item.id === 'ventes-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.stores.manage')
    }

    // Paramètres
    if (item.id === 'parametres-menu') {
      return (
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.general') ||
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.receipt') ||
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.restoration') ||
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.kitchen_printer') ||
        hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.licenses')
      )
    }

    // Corbeille
    if (item.id === 'trash-menu') {
      return hasPermissionCode(user, activeOrganizationId, 'admin_panel.trash.access')
    }

    // Équipe
    if (item.id === 'equipe') {
      const canManage = hasPermissionCode(
        user,
        activeOrganizationId,
        'admin_panel.employees.manage'
      )
 
      const canEditProfile = hasPermissionCode(
        user,
        activeOrganizationId,
        'admin_panel.employees.profile.edit'
      )
 
      // Only show if user has at least one permission
      return canManage || canEditProfile
    }

    // Le reste est contrôlé uniquement par "accès back-office" côté API.
    return true
  })

  const handleNavigation = (path: string) => {
    navigate(`/${path}`)
  }

  const isParentActive = (item: NavItem) =>
    getVisibleChildren(item).some(
      (c) => activeTab === c.id || activeTab.startsWith(`${c.id}/`)
    )

  const isItemActive = (item: NavItem) => {
    if (item.children?.length) return isParentActive(item) ?? false
    if (item.id === 'dashboard') return activeTab === item.id
    return activeTab === item.id || activeTab.startsWith(`${item.id}/`)
  }

  const getVisibleChildren = (item: NavItem) => {
    if (item.id === 'parametres-menu') {
      return (item.children ?? []).filter((sub) => {
        switch (sub.id) {
          case 'settings/general':
            return hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.general')
          case 'settings/receipts':
            return hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.receipt')
          case 'settings/restaurant-options':
            return hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.restoration')
          case 'settings/kitchen-printers':
            return hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.kitchen_printer')
          case 'settings/public-links':
            return (
              hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.general') &&
              (generalSetting?.online_articles ?? false)
            )
          case 'settings/subscription':
            return hasPermissionCode(user, activeOrganizationId, 'admin_panel.settings.licenses')
          default:
            return false
        }
      })
    }

    if (item.id === 'equipe') {
      const canManage = hasPermissionCode(
        user,
        activeOrganizationId,
        'admin_panel.employees.manage'
      )

      const canEditProfile = hasPermissionCode(
        user,
        activeOrganizationId,
        'admin_panel.employees.profile.edit'
      )

      return (item.children ?? []).filter((sub) => {
        switch (sub.id) {
          case 'roles':
            // seulement profile.edit
            return canEditProfile

          case 'users':
            // manage OU profile.edit
            return canManage || canEditProfile

          default:
            return false
        }
      })
    }

  return item.children ?? []
}

  const renderCollapsible = (item: NavItem) => {
    const isOpen = openSections[item.id] ?? false
    const active = isParentActive(item)

    return (
      <div key={item.id} className="mb-3">
        <button
          type="button"
          onClick={() => toggleSection(item.id)}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-500 ${
            active
              ? 'bg-[#3B82F6]/20 text-white'
              : 'text-white/80 hover:bg-[#3B82F6]/20 hover:text-white'
          }`}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-semibold">{item.label}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen &&
          getVisibleChildren(item).map((sub) => {
            const isSubActive =
              activeTab === sub.id || activeTab.startsWith(`${sub.id}/`)
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleNavigation(sub.id)}
                className={`mt-1 flex w-full items-center gap-3 rounded-xl py-3 pl-12 pr-4 text-left transition-all duration-300 ${
                  isSubActive
                    ? 'bg-[#3B82F6] text-white shadow-lg'
                    : 'text-white/80 hover:bg-[#3B82F6]/20 hover:text-white'
                }`}
              >
                <sub.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{sub.label}</span>
              </button>
            )
          })}
      </div>
    )
  }

  return (
    <div className="fixed z-50 flex h-full w-64 flex-col bg-[#0F2E4A] shadow-2xl backdrop-blur-xl">
      <div className="shrink-0 border-b border-white/10 p-6">
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex min-h-[5.5rem] w-full items-center justify-center rounded-2xl p-2 cursor-pointer"
          >
            {currentOrganization?.logo ? (
              <img
                src={resolveBackendUrl(currentOrganization.logo) ?? ''}
                alt={`${currentOrganization?.name || 'Lynx'}`}
                className="max-h-20 max-w-full object-contain drop-shadow-md transition-all duration-300"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <span className="px-4 text-center text-lg font-bold tracking-tight text-white">
                {currentOrganization?.name || 'Lynx'}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {navItemsFiltered.map((item) => {
          if (item.children?.length) {
            return renderCollapsible(item)
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`mb-3 flex w-full transform items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-500 hover:scale-105 ${
                isItemActive(item)
                  ? 'translate-x-2 scale-105 bg-[#3B82F6] text-white shadow-xl'
                  : 'text-white/80 hover:translate-x-1 hover:bg-[#3B82F6]/20 hover:text-white'
              }`}
              onClick={() => handleNavigation(item.id)}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-semibold">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
