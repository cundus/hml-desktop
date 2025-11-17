import { createHashRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/home/Home'
import Pets from './pages/Pets'
import Settings from './pages/Settings'
import BranchPage from './pages/settings/master/Branch'
import UserPage from './pages/settings/master/User'
import CustomerPage from './pages/settings/master/Customer'
import AccessControlPage from './pages/settings/AccessControl'
import RequireAuth from './components/RequireAuth'
import RoleGuard from './components/RoleGuard'
import Forbidden from './pages/Forbidden'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import SalesPage from './pages/sales'

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
            element: <RoleGuard requiredPermissions={['settings.access-control.manage']} />,
            children: [{ path: 'access-control', element: <AccessControlPage /> }]
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
