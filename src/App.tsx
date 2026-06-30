import type { ReactElement, ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RequirePermission from './components/RequirePermission'
import Layout from './components/Layout'
import { useAuth } from './contexts/useAuth'
import { hasPermissionCode, getDefaultLandingPage } from './lib/permissions'
import { subscribeToSuspension } from './api/subscriptionEvents'

import SuspendedPage from './pages/SuspendedPage'

import ItemCategoriesIndex from './pages/item-categories'
import DiscountsIndex from './pages/discounts'
import StoresIndex from './pages/stores/index'
import StoreShow from './pages/stores/show'
import CashRegistersIndex from './pages/cash-registers/index'
import CashRegisterShow from './pages/cash-registers/show'
import CustomersIndex from './pages/customers'
import CustomerShowPage from './pages/customers/show'
import PlaceholderPage from './pages/PlaceholderPage'
import ItemsIndex from './pages/items/index'
import ItemFormPage from './pages/items/form'
import ItemShowPage from './pages/items/show'
import Login from './pages/auth/Login'
//import Register from './pages/auth/Register'
import RegisterRequest from './pages/auth/RegisterRequest'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import GeneralSettingPage from './pages/setting/GeneralSettingPage'
import ReceiptSettingPage from './pages/setting/ReceiptSettingPage'
import SubscriptionPage from './pages/setting/SubscriptionPage'
import RestaurantOptionPage from './pages/setting/RestaurantOptionPage'
import KitchenPrinterPage from './pages/setting/KitchenPrinterPage'
import PublicLinksPage from './pages/setting/PublicLinksPage'
import PaymentMethodsIndex from './pages/payment-methods'
import PaymentMethodShow from './pages/payment-methods/show'
import VatRatesIndex from './pages/vat-rates'
import RolesIndex from './pages/roles'
import UsersIndex from './pages/users'
import UserShow from './pages/users/show'
import UserProfilePage from './pages/userprofile/UserProfilePage'
import FavoritesIndex from './pages/favorites'
import OptionsIndex from './pages/options'
import SuppliersIndex from './pages/suppliers'
import PurchaseOrdersIndex from './pages/purchase-orders'
import PurchaseOrderForm from './pages/purchase-orders/form'
import PurchaseOrderShow from './pages/purchase-orders/show'
import PurchaseOrderReceive from './pages/purchase-orders/receive'
import PurchaseOrderReceptionShow from './pages/purchase-orders/reception-show'
import StockTransfersIndex from './pages/stock-transfers/index'
import StockTransferForm from './pages/stock-transfers/form'
import StockAdjustmentsIndex from './pages/stock-adjustments/index'
import StockAdjustmentForm from './pages/stock-adjustments/form'
import SalesIndex from './pages/sales/index'
import SaleForm from './pages/sales/form'
import InvoicePage from './pages/sales/InvoicePage'
import SalesRecapPage from './pages/rapports/SalesRecapPage'
import SalesByItemsPage from './pages/rapports/SalesByItemsPage'
import SalesByEmployeePage from './pages/rapports/SalesByEmployeePage'
import SalesByCategoryPage from './pages/rapports/SalesByCategoryPage'
import SalesByPaymentMethodPage from './pages/rapports/SalesByPaymentMethodPage'
import SalesByTaxPage from './pages/rapports/SalesByTaxPage'
import SalesInvoicesPage from './pages/rapports/SalesInvoicesPage'
import ItemBuybacksPage from './pages/rapports/ItemBuybacksPage'
import WorkPeriodsPage from './pages/rapports/WorkPeriodsPage'
import SalesByStorePage from './pages/dashboard/SalesByStorePage'
import DetailedSummaryPage from './pages/dashboard/DetailedSummaryPage'
import StockEvaluationPage from './pages/stock/EvaluationPage'
import StockMovementsPage from './pages/stock/MovementsPage'
import InventoriesIndex from './pages/inventories/index'
import InventoryCreatePage from './pages/inventories/create'
import InventoryShowPage from './pages/inventories/show'

import TrashStores from './pages/trash/stores'
import TrashItems from './pages/trash/items'
import TrashItemCategories from './pages/trash/item-categories'
import TrashCashRegisters from './pages/trash/cash-registers'
import TrashPaymentMethods from './pages/trash/payment-methods'
import TrashCustomers from './pages/trash/customers'
import TrashVatRates from './pages/trash/vat-rates'
import AccueilPage from './pages/accueil'
import PublicStoreArticlesPage from './pages/public/PublicStoreArticlesPage'

function withLayout(page: ReactElement) {
  return <Layout>{page}</Layout>
}

function DashboardWrapper() {
  const { user, activeOrganizationId, bootstrapping } = useAuth()
  if (bootstrapping) return null
  
  const canSeeDashboard = hasPermissionCode(user, activeOrganizationId, 'admin_panel.dashboard.view')
  
  if (canSeeDashboard) {
    return <SalesByStorePage />
  }
  
  return <SalesRecapPage />
}

function SuspensionListener() {
  const navigate = useNavigate()
  
  useEffect(() => {
    return subscribeToSuspension(() => {
      navigate('/suspended')
    })
  }, [navigate])

  return null
}

function RequireAnyPermission({ codes, children }: { codes: string[]; children: ReactNode }) {
  const { user, activeOrganizationId } = useAuth()
  const hasAny = codes.some(code =>
    hasPermissionCode(user, activeOrganizationId, code)
  )
  return hasAny ? children : null
}

function SmartRedirect() {
  const { user, activeOrganizationId } = useAuth()
  return <Navigate to={getDefaultLandingPage(user, activeOrganizationId)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SuspensionListener />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} /> */}
        <Route path="/register-request" element={<RegisterRequest />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/:organizationSlug/:storeSlug" element={<PublicStoreArticlesPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SmartRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.dashboard.view">
                {withLayout(<DashboardWrapper />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accueil"
          element={
            <ProtectedRoute>
              {withLayout(<AccueilPage />)}
            </ProtectedRoute>
          }
        />  
        <Route
          path="/userprofile"
          element={
            <ProtectedRoute>
              {withLayout(<UserProfilePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizations"
          element={
            <ProtectedRoute>
              <Navigate to="/user-profile" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<StoresIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<StoreShow />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/item-categories"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<ItemCategoriesIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/discounts"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<DiscountsIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<ItemsIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/create"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<ItemFormPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<ItemShowPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:id/edit"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<ItemFormPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              {withLayout(<SuppliersIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrdersIndex type="central" />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrdersIndex type="supplier" />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/create"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders/create"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderForm isCentral />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders/:id"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderShow />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders/:id/edit"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderForm isCentral />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders/:id/receive"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderReceive />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/central-orders/:id/receptions/:receptionId"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderReceptionShow />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/:id"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderShow />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/:id/edit"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/:id/receive"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderReceive />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders/:id/receptions/:receptionId"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderReceptionShow />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-transfers"
          element={
            <ProtectedRoute>
              {withLayout(<StockTransfersIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-transfers/create"
          element={
            <ProtectedRoute>
              {withLayout(<StockTransferForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-transfers/:id/edit"
          element={
            <ProtectedRoute>
              {withLayout(<StockTransferForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-adjustments"
          element={
            <ProtectedRoute>
              {withLayout(<StockAdjustmentsIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-adjustments/create"
          element={
            <ProtectedRoute>
              {withLayout(<StockAdjustmentForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-adjustments/:id/edit"
          element={
            <ProtectedRoute>
              {withLayout(<StockAdjustmentForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              {withLayout(<SalesIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/create"
          element={
            <ProtectedRoute>
              {withLayout(<SaleForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/:id/edit"
          element={
            <ProtectedRoute>
              {withLayout(<SaleForm />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/:id/invoice"
          element={
            <ProtectedRoute>
              <InvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesRecapPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-articles"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesByItemsPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-employe"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesByEmployeePage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-categorie"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesByCategoryPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-moyen-de-paiement"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesByPaymentMethodPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-taxe"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesByTaxPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/factures-des-ventes"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<SalesInvoicesPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/rachats-d-article"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<ItemBuybacksPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/periode-de-travail"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.reports.view">
                {withLayout(<WorkPeriodsPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/synthese-globale"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.dashboard.view">
                {withLayout(<SalesByStorePage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/resume-detaille"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.dashboard.view">
                {withLayout(<DetailedSummaryPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/movements"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<StockMovementsPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/evaluation"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<StockEvaluationPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventories"
          element={
            <ProtectedRoute>
              {withLayout(<InventoriesIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventories/create"
          element={
            <ProtectedRoute>
              {withLayout(<InventoryCreatePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventories/:id"
          element={
            <ProtectedRoute>
              {withLayout(<InventoryShowPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<CustomersIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<CustomerShowPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<FavoritesIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/options"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.items.manage">
                {withLayout(<OptionsIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-registers"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<CashRegistersIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-registers/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<CashRegisterShow />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vat-rates"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<VatRatesIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-method-categories"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(
                  <PlaceholderPage title="Payment method categories" />
                )}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-methods"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<PaymentMethodsIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-methods/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.stores.manage">
                {withLayout(<PaymentMethodShow />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/stores"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashStores />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/items"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashItems />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/item-categories"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashItemCategories />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/cash-registers"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashCashRegisters />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/payment-methods"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashPaymentMethods />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/customers"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashCustomers />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trash/vat-rates"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.trash.access">
                {withLayout(<TrashVatRates />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Navigate to="/settings/general" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/general"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.general">
                {withLayout(<GeneralSettingPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/receipts"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.receipt">
                {withLayout(<ReceiptSettingPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/subscription"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.licenses">
                {withLayout(<SubscriptionPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/restaurant-options"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.restoration">
                {withLayout(<RestaurantOptionPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/kitchen-printers"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.kitchen_printer">
                {withLayout(<KitchenPrinterPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/public-links"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.general">
                {withLayout(<PublicLinksPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.employees.profile.edit">
                {withLayout(<RolesIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/permissions"
          element={
            <ProtectedRoute>
              {withLayout(<PlaceholderPage title="Permissions" />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RequireAnyPermission codes={[
                'admin_panel.employees.manage',
                'admin_panel.employees.profile.edit'
              ]}>
                {withLayout(<UsersIndex />)}
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <RequireAnyPermission codes={[
                'admin_panel.employees.manage',
                'admin_panel.employees.profile.edit'
              ]}>
                {withLayout(<UserShow />)}
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              {withLayout(
                <div className="flex min-h-screen flex-1 items-center justify-center bg-[#EFF6FF] p-8">
                  <div className="text-center">
                    <h1 className="mb-4 text-4xl font-bold text-gray-800">
                      404
                    </h1>
                    <p className="mb-6 text-xl text-gray-600">
                      Page not found
                    </p>
                    <a
                      href="/dashboard"
                      className="text-[#3B82F6] underline hover:text-[#2563EB]"
                    >
                      Back to dashboard
                    </a>
                  </div>
                </div>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/suspended"
          element={
            <ProtectedRoute>
              <SuspendedPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
