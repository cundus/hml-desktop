import { Fragment, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import HomeIcon from '@mui/icons-material/Home'
import PetsIcon from '@mui/icons-material/Pets'
import SettingsIcon from '@mui/icons-material/Settings'
import LogoutIcon from '@mui/icons-material/Logout'
import StoreIcon from '@mui/icons-material/Store'
import UserIcon from '@mui/icons-material/Person'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import useAuth from '../hooks/useAuth'

export type MenuItem = {
  key: string
  label: string
  icon?: ReactNode
  path?: string
  roles?: string[]
  children?: MenuItem[]
  isLogout?: boolean
}

const menus: MenuItem[] = [
  { key: 'home', label: 'Home', icon: <HomeIcon />, path: '/', roles: [] },
  { key: 'pets', label: 'Pets', icon: <PetsIcon />, path: '/pets', roles: [] },
  { key: 'sales', label: 'Sales', icon: <ShoppingBasketIcon />, path: '/sales', roles: [] },
  {
    key: 'settings-group',
    label: 'Settings',
    icon: <SettingsIcon />,
    roles: ['admin'],
    children: [
      {
        key: 'master',
        label: 'Master Data',
        icon: <SettingsIcon />,
        roles: ['admin'],
        children: [
          {
            key: 'master-branch',
            label: 'Master Branch',
            icon: <StoreIcon />,
            path: '/master-branch',
            roles: ['admin']
          },
          {
            key: 'master-pet',
            label: 'Master Pet',
            icon: <SettingsIcon />,
            path: '/master-pet',
            roles: ['admin']
          },
          {
            key: 'master-user',
            label: 'Master User',
            icon: <UserIcon />,
            path: '/master-user',
            roles: ['admin']
          }
        ]
      }
    ]
  },
  { key: 'logout', label: 'Logout', icon: <LogoutIcon />, isLogout: true }
]

function userHasRole(userRoles: string[], required?: string[]): boolean {
  if (!required || required.length === 0) return true
  return required.some((role) => userRoles.includes(role))
}

export default function SideNav(): React.JSX.Element {
  const { roles, logout } = useAuth()
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
      const visibleChildren = item.children.filter((child) => userHasRole(roles, child.roles))
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

    if (!userHasRole(roles, item.roles)) return null

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
