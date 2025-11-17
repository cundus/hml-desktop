import { ExpandLess, ExpandMore } from '@mui/icons-material'
import HomeIcon from '@mui/icons-material/Home'
import LogoutIcon from '@mui/icons-material/Logout'
import UserIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
import StoreIcon from '@mui/icons-material/Store'
import Collapse from '@mui/material/Collapse'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { Fragment, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export type MenuItem = {
  key: string
  label: string
  icon?: ReactNode
  path?: string
  permissions?: string[]
  children?: MenuItem[]
  isLogout?: boolean
}

const menus: MenuItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: <HomeIcon />,
    path: '/',
    permissions: ['dashboard.view']
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: <ShoppingBasketIcon />,
    path: '/sales',
    permissions: ['sales.view']
  },
  {
    key: 'settings-group',
    label: 'Settings',
    icon: <SettingsIcon />,
    permissions: ['settings.view'],
    children: [
      {
        key: 'master',
        label: 'Master Data',
        icon: <SettingsIcon />,
        permissions: ['settings.view'],
        children: [
          {
            key: 'master-branch',
            label: 'Master Branch',
            icon: <StoreIcon />,
            path: '/master-branch',
            permissions: ['master.branch.manage']
          },
          {
            key: 'master-user',
            label: 'Master User',
            icon: <UserIcon />,
            path: '/master-user',
            permissions: ['master.user.manage']
          },
          {
            key: 'master-customer',
            label: 'Master Customer',
            icon: <UserIcon />,
            path: '/master-customer',
            permissions: ['master.customer.manage']
          }
        ]
      },
      {
        key: 'access-control',
        label: 'Roles & Permissions',
        icon: <SettingsIcon />,
        path: '/access-control',
        permissions: ['settings.access-control.manage']
      }
    ]
  },
  { key: 'logout', label: 'Logout', icon: <LogoutIcon />, isLogout: true }
]

function userHasPermission(
  hasPermission: (required: string | string[]) => boolean,
  required?: string[]
): boolean {
  if (!required || required.length === 0) return true
  return hasPermission(required)
}

export default function SideNav(): React.JSX.Element {
  const { hasPermission, logout } = useAuth()
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const toggle = (key: string): void => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderMenuItem = (item: MenuItem, level = 0): React.JSX.Element | null => {
    const indent = 2 + level * 2

    if (item.isLogout) {
      return (
        <ListItemButton key={item.key} onClick={logout} sx={{ mt: 'auto', pl: indent }}>
          {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
          <ListItemText sx={{ fontSize: 'sm' }} primary={item.label} />
        </ListItemButton>
      )
    }

    if (item.children && item.children.length > 0) {
      const visibleChildren = item.children.filter((child) =>
        userHasPermission(hasPermission, child.permissions)
      )
      if (visibleChildren.length === 0) return null

      const open = !!openMap[item.key]

      return (
        <Fragment key={item.key}>
          <ListItemButton onClick={() => toggle(item.key)} sx={{ pl: indent }}>
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText sx={{ fontSize: 'sm' }} primary={item.label} />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>

          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {visibleChildren.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        </Fragment>
      )
    }

    if (!userHasPermission(hasPermission, item.permissions)) return null

    if (item.path) {
      return (
        <ListItemButton key={item.key} component={NavLink} to={item.path} end sx={{ pl: indent }}>
          {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
          <ListItemText sx={{ fontSize: 'sm' }} primary={item.label} />
        </ListItemButton>
      )
    }

    return (
      <ListItemButton key={item.key} sx={{ pl: indent }}>
        {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
        <ListItemText sx={{ fontSize: 'sm' }} primary={item.label} />
      </ListItemButton>
    )
  }

  return (
    <List sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {menus.map((item) => renderMenuItem(item))}
    </List>
  )
}
