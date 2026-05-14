import type { ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RequirePermission from './components/RequirePermission'
import Layout from './components/Layout'
import { useAuth } from './contexts/useAuth'
import { hasPermissionCode } from './lib/permissions'

import ItemCategoriesIndex from './pages/item-categories'
import StoresIndex from './pages/stores/index'
import StoreShow from './pages/stores/show'
import CashRegistersIndex from './pages/cash-registers/index'
import CashRegisterShow from './pages/cash-registers/show'
import CustomersIndex from './pages/customers'
import PlaceholderPage from './pages/PlaceholderPage'
import ItemsIndex from './pages/items/index'
import ItemFormPage from './pages/items/form'
import ItemShowPage from './pages/items/show'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RegisterRequest from './pages/auth/RegisterRequest'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import GeneralSettingPage from './pages/setting/GeneralSettingPage'
import ReceiptSettingPage from './pages/setting/ReceiptSettingPage'
import PaymentMethodsIndex from './pages/payment-methods'
import PaymentMethodShow from './pages/payment-methods/show'
import VatRatesIndex from './pages/vat-rates'
import RolesIndex from './pages/roles'
import UsersIndex from './pages/users'
import UserShow from './pages/users/show'
import UserProfilePage from './pages/userprofile/UserProfilePage'
import FavoritesIndex from './pages/favorites'
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-request" element={<RegisterRequest />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {withLayout(<DashboardWrapper />)}
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
              {withLayout(<StoresIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/stores/:id"
          element={
            <ProtectedRoute>
              {withLayout(<StoreShow />)}
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
          path="/purchase-orders/create-central"
          element={
            <ProtectedRoute>
              {withLayout(<PurchaseOrderForm isCentral />)}
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
              {withLayout(<SalesRecapPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-articles"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByItemsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-employe"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByEmployeePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-categorie"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByCategoryPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-moyen-de-paiement"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByPaymentMethodPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/ventes-par-taxe"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByTaxPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/factures-des-ventes"
          element={
            <ProtectedRoute>
              {withLayout(<SalesInvoicesPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/rachats-d-article"
          element={
            <ProtectedRoute>
              {withLayout(<ItemBuybacksPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/periode-de-travail"
          element={
            <ProtectedRoute>
              {withLayout(<WorkPeriodsPage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/synthese-globale"
          element={
            <ProtectedRoute>
              {withLayout(<SalesByStorePage />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapports/resume-detaille"
          element={
            <ProtectedRoute>
              {withLayout(<DetailedSummaryPage />)}
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
              {withLayout(<CustomersIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              {withLayout(<FavoritesIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-registers"
          element={
            <ProtectedRoute>
              {withLayout(<CashRegistersIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-registers/:id"
          element={
            <ProtectedRoute>
              {withLayout(<CashRegisterShow />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/vat-rates"
          element={
            <ProtectedRoute>
              {withLayout(<VatRatesIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-method-categories"
          element={
            <ProtectedRoute>
              {withLayout(
                <PlaceholderPage title="Payment method categories" />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-methods"
          element={
            <ProtectedRoute>
              {withLayout(<PaymentMethodsIndex />)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-methods/:id"
          element={
            <ProtectedRoute>
              {withLayout(<PaymentMethodShow />)}
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
              <RequirePermission code="admin_panel.settings.manage">
                {withLayout(<GeneralSettingPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/receipts"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.settings.manage">
                {withLayout(<ReceiptSettingPage />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.employees.manage">
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
              <RequirePermission code="admin_panel.employees.manage">
                {withLayout(<UsersIndex />)}
              </RequirePermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <RequirePermission code="admin_panel.employees.manage">
                {withLayout(<UserShow />)}
              </RequirePermission>
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
      </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
