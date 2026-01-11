import { createHashRouter, RouterProvider } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { ShiftProvider } from './contexts/ShiftContext'
import { BranchConfigProvider } from './contexts/BranchConfigContext'
import GlobalAlertModal from './components/GlobalAlertModal'
import RequireAuth from './components/RequireAuth'
import RoleGuard from './components/RoleGuard'
import MainLayout from './layouts/MainLayout'
import Forbidden from './pages/Forbidden'
import Home from './pages/home/Home'
import InventoryBatchesPage from './pages/inventory/Batches'
import InventoryDashboardPage from './pages/inventory/Dashboard'
import InventoryPricingPage from './pages/inventory/Pricing'
import InventoryTransactionsPage from './pages/inventory/Transactions'
import InventoryManagementPage from './pages/inventory'
import BulkStockAdjustmentsPage from './pages/inventory/BulkAdjustments'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Pets from './pages/Pets'
import SalesPage from './pages/sales'
import SalesReportsPage from './pages/sales/Reports'
import TransactionDetailPage from './pages/sales/TransactionDetail'
import PurchaseOrdersPage from './pages/purchasing/PurchaseOrders'
import PurchaseOrderFormPage from './pages/purchasing/PurchaseOrderForm'
import Settings from './pages/Settings'
import AccessControlPage from './pages/settings/AccessControl'
import PrinterSettings from './pages/settings/PrinterSettings'
import CategoryPage from './pages/settings/master/Category'
import CustomerPage from './pages/settings/master/Customer'
import CustomerCategoryPage from './pages/settings/master/CustomerCategory'
import ProductPage from './pages/settings/master/Product'
import StorePage from './pages/settings/master/Store'
import SupplierPage from './pages/settings/master/Supplier'
import UserPage from './pages/settings/master/User'
import UomPage from './pages/settings/master/Uom'
import PriceCategoryPage from './pages/settings/master/PriceCategory'
import PaymentMethodPage from './pages/settings/master/PaymentMethod'
import WarehousePricingListPage from './pages/warehouse/PricingList'
import ProductPricingPage from './pages/warehouse/ProductPricing'
import WarehousePurchasingPage from './pages/warehouse/Purchasing'
import WarehouseStockOpnamePage from './pages/warehouse/StockOpname'
import WarehouseStocksPage from './pages/warehouse/Stocks'
import ExpensesPage from './pages/operations/expenses'
import ShiftHistoryPage from './pages/operations/shifts'
import SetupPage from './pages/Setup'

const router = createHashRouter([
  { path: '/setup', element: <SetupPage /> },
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'pets', element: <Pets /> },
          { path: 'sales', element: <SalesPage /> },
          {
            element: <RoleGuard requiredPermissions={['sales.pos']} />,
            children: [{ path: 'sales/pos', element: <SalesPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['sales.reports']} />,
            children: [
              { path: 'sales/reports', element: <SalesReportsPage /> },
              { path: 'sales/transaction/:transactionId', element: <TransactionDetailPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['settings.view']} />,
            children: [{ path: 'settings', element: <Settings /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.user.manage']} />,
            children: [{ path: 'master-user', element: <UserPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.customer.manage']} />,
            children: [{ path: 'master-customer', element: <CustomerPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.product.manage']} />,
            children: [{ path: 'master-product', element: <ProductPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.category.manage']} />,
            children: [{ path: 'master-category', element: <CategoryPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.supplier.manage']} />,
            children: [{ path: 'master-supplier', element: <SupplierPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.store.manage']} />,
            children: [{ path: 'master-store', element: <StorePage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.customer-category.manage']} />,
            children: [{ path: 'master-customer-category', element: <CustomerCategoryPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.uom.manage']} />,
            children: [{ path: 'master-uom', element: <UomPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['pricing.categories']} />,
            children: [{ path: 'pricing/categories', element: <PriceCategoryPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['settings.view']} />,
            children: [{ path: 'master-payment-method', element: <PaymentMethodPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['settings.access-control.manage']} />,
            children: [{ path: 'access-control', element: <AccessControlPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['settings.printer.manage']} />,
            children: [{ path: 'settings/printer', element: <PrinterSettings /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['warehouse.manage']} />,
            children: [
              { path: 'warehouse/stocks', element: <WarehouseStocksPage /> },
              { path: 'warehouse/purchasing', element: <WarehousePurchasingPage /> },
              { path: 'warehouse/stock-opname', element: <WarehouseStockOpnamePage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['pricing.products']} />,
            children: [
              { path: 'pricing/products', element: <WarehousePricingListPage /> },
              { path: 'pricing/products/:productId', element: <ProductPricingPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['inventory.manage']} />,
            children: [
              { path: 'inventory', element: <InventoryManagementPage /> },
              { path: 'inventory/dashboard', element: <InventoryDashboardPage /> },
              { path: 'inventory/pricing', element: <InventoryPricingPage /> },
              { path: 'inventory/batches', element: <InventoryBatchesPage /> },
              { path: 'inventory/transactions', element: <InventoryTransactionsPage /> },
              { path: 'inventory/adjustments', element: <BulkStockAdjustmentsPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['purchasing.manage']} />,
            children: [
              { path: 'purchasing/orders', element: <PurchaseOrdersPage /> },
              { path: 'purchasing/order-form', element: <PurchaseOrderFormPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['operations.expenses']} />,
            children: [
              { path: 'operations/expenses', element: <ExpensesPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['operations.shift_history']} />,
            children: [
              { path: 'operations/shifts', element: <ShiftHistoryPage /> }
            ]
          }
        ]
      }
    ]
  },
  { path: '/forbidden', element: <Forbidden /> },
  { path: '*', element: <NotFound /> }
])

function App(): React.JSX.Element {
  return (
    <ToastProvider>
      <BranchConfigProvider>
        <ShiftProvider>
          <RouterProvider router={router} />
          <GlobalAlertModal />
        </ShiftProvider>
      </BranchConfigProvider>
    </ToastProvider>
  )
}

export default App
