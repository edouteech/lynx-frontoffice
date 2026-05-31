import { isOwnerRoleName } from './ownerRole'
import type { User } from '../types/api'

export function hasPermissionCode(
  user: User | null | undefined,
  activeOrganizationId: number | null | undefined,
  code: string
): boolean {
  if (!user || activeOrganizationId == null) return false
  const m = user.organization_memberships?.find(
    (x) => x.organization_id === activeOrganizationId
  )
  const roleName = m?.role?.name ?? ''
  if (isOwnerRoleName(roleName)) return true
  const perms = m?.role?.permissions ?? []
  return perms.some((p) => p.code === code)
}

export function getDefaultLandingPage(
  user: User | null | undefined,
  activeOrganizationId: number | null | undefined
): string {
  if (!user) return '/login'

  const has = (code: string) => hasPermissionCode(user, activeOrganizationId, code)

  // Tableau de bord
  if (has('admin_panel.dashboard.view')) return '/dashboard'

  // Rapports
  if (has('admin_panel.reports.view')) return '/rapports/ventes'

  // Articles
  if (has('admin_panel.items.manage')) return '/items'

  // Stocks
  if (has('admin_panel.stock.manage')) return '/suppliers'

  // Paramètres globaux
  if (has('admin_panel.stores.manage')) return '/stores'

  // Paramètres sous-sections
  if (has('admin_panel.settings.general')) return '/settings/general'
  if (has('admin_panel.settings.receipt')) return '/settings/receipts'
  if (has('admin_panel.settings.restoration')) return '/settings/restaurant-options'
  if (has('admin_panel.settings.kitchen_printer')) return '/settings/kitchen-printers'
  if (has('admin_panel.settings.licenses')) return '/settings/subscription'

  // Équipe
  if (has('admin_panel.employees.manage') || has('admin_panel.employees.profile.edit')) {
    return '/users'
  }

  // Corbeille
  if (has('admin_panel.trash.access')) return '/trash/stores'

  // Fallback : connexion de base (caissier back-office)
  return '/accueil'
}

