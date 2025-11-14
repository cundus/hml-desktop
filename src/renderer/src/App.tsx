import { createHashRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Pets from './pages/Pets'
import Settings from './pages/Settings'
import RequireAuth from './components/RequireAuth'
import RoleGuard from './components/RoleGuard'
import Forbidden from './pages/Forbidden'
import Login from './pages/Login'

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
          {
            element: <RoleGuard allowedRoles={['admin']} />,
            children: [{ path: 'settings', element: <Settings /> }]
          }
        ]
      }
    ]
  },
  { path: '/forbidden', element: <Forbidden /> },
  { path: '*', element: <div>Not Found</div> }
])

function App(): React.JSX.Element {
  return <RouterProvider router={router} />
}

export default App
