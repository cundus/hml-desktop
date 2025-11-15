import { createHashRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Pets from './pages/Pets'
import Settings from './pages/Settings'
import BranchPage from './pages/settings/master/Branch'
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
            element: <RoleGuard allowedRoles={['admin']} />,
            children: [
              { path: 'settings', element: <Settings /> },
              { path: 'master-branch', element: <BranchPage /> }
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
