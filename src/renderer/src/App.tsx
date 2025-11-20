import { createHashRouter, RouterProvider } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import RoleGuard from './components/RoleGuard'
import MainLayout from './layouts/MainLayout'
import Forbidden from './pages/Forbidden'
import Home from './pages/home/Home'
import InventoryBatchesPage from './pages/inventory/Batches'
import InventoryDashboardPage from './pages/inventory/Dashboard'
import InventoryPricingPage from './pages/inventory/Pricing'
import InventoryTransactionsPage from './pages/inventory/Transactions'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Pets from './pages/Pets'
import SalesPage from './pages/sales'
import SalesReportsPage from './pages/sales/Reports'
import PurchaseOrdersPage from './pages/purchasing/PurchaseOrders'
import PurchaseOrderFormPage from './pages/purchasing/PurchaseOrderForm'
import Settings from './pages/Settings'
import AccessControlPage from './pages/settings/AccessControl'
import CategoryPage from './pages/settings/master/Category'
import CustomerPage from './pages/settings/master/Customer'
import CustomerCategoryPage from './pages/settings/master/CustomerCategory'
import ProductPage from './pages/settings/master/Product'
import StorePage from './pages/settings/master/Store'
import SupplierPage from './pages/settings/master/Supplier'
import UserPage from './pages/settings/master/User'
import WarehousePricingPage from './pages/warehouse/Pricing'
import WarehousePurchasingPage from './pages/warehouse/Purchasing'
import WarehouseStockOpnamePage from './pages/warehouse/StockOpname'
import WarehouseStocksPage from './pages/warehouse/Stocks'

const router = createHashRouter([
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
            element: <RoleGuard requiredPermissions={['sales.manage']} />,
            children: [
              { path: 'sales/pos', element: <SalesPage /> },
              { path: 'sales/reports', element: <SalesReportsPage /> }
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
            element: <RoleGuard requiredPermissions={['settings.access-control.manage']} />,
            children: [{ path: 'access-control', element: <AccessControlPage /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['warehouse.manage']} />,
            children: [
              { path: 'warehouse/stocks', element: <WarehouseStocksPage /> },
              { path: 'warehouse/purchasing', element: <WarehousePurchasingPage /> },
              { path: 'warehouse/stock-opname', element: <WarehouseStockOpnamePage /> },
              { path: 'warehouse/pricing', element: <WarehousePricingPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['inventory.manage']} />,
            children: [
              { path: 'inventory/dashboard', element: <InventoryDashboardPage /> },
              { path: 'inventory/pricing', element: <InventoryPricingPage /> },
              { path: 'inventory/batches', element: <InventoryBatchesPage /> },
              { path: 'inventory/transactions', element: <InventoryTransactionsPage /> }
            ]
          },
          {
            element: <RoleGuard requiredPermissions={['purchasing.manage']} />,
            children: [
              { path: 'purchasing/orders', element: <PurchaseOrdersPage /> },
              { path: 'purchasing/order-form', element: <PurchaseOrderFormPage /> }
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
  return <RouterProvider router={router} />
}

export default App
