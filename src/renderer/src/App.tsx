import { createHashRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/home/Home'
import Pets from './pages/Pets'
import Settings from './pages/Settings'
import BranchPage from './pages/settings/master/Branch'
import UserPage from './pages/settings/master/User'
import CustomerPage from './pages/settings/master/Customer'
import ProductPage from './pages/settings/master/Product'
import CategoryPage from './pages/settings/master/Category'
import SupplierPage from './pages/settings/master/Supplier'
import StorePage from './pages/settings/master/Store'
import CustomerCategoryPage from './pages/settings/master/CustomerCategory'
import AccessControlPage from './pages/settings/AccessControl'
import RequireAuth from './components/RequireAuth'
import RoleGuard from './components/RoleGuard'
import Forbidden from './pages/Forbidden'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import SalesPage from './pages/sales'
import WarehouseStocksPage from './pages/warehouse/Stocks'
import WarehousePurchasingPage from './pages/warehouse/Purchasing'
import WarehouseStockOpnamePage from './pages/warehouse/StockOpname'
import WarehousePricingPage from './pages/warehouse/Pricing'

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
            element: <RoleGuard requiredPermissions={['settings.view']} />,
            children: [{ path: 'settings', element: <Settings /> }]
          },
          {
            element: <RoleGuard requiredPermissions={['master.branch.manage']} />,
            children: [{ path: 'master-branch', element: <BranchPage /> }]
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
