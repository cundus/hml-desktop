import { ExpandLess, ExpandMore } from '@mui/icons-material'
import HomeIcon from '@mui/icons-material/Home'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
import StoreIcon from '@mui/icons-material/Store'
import InventoryIcon from '@mui/icons-material/Inventory'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
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
    icon: <HomeIcon fontSize="small" />,
    path: '/',
    permissions: ['dashboard.view']
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: <ShoppingBasketIcon fontSize="small" />,
    permissions: ['sales.view'],
    children: [
      {
        key: 'sales-pos',
        label: 'Point of Sale',
        path: '/sales/pos',
        permissions: ['sales.manage']
      },
      {
        key: 'sales-reports',
        label: 'Sales Reports',
        path: '/sales/reports',
        permissions: ['sales.view']
      }
    ]
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    icon: <StoreIcon fontSize="small" />,
    permissions: ['warehouse.manage'],
    children: [
      {
        key: 'warehouse-stocks',
        label: 'Stocks',
        path: '/warehouse/stocks',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-purchasing',
        label: 'Purchasing',
        path: '/warehouse/purchasing',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-stock-opname',
        label: 'Stock Opname',
        path: '/warehouse/stock-opname',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-pricing',
        label: 'Pricing',
        path: '/warehouse/pricing',
        permissions: ['warehouse.manage']
      }
    ]
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: <InventoryIcon fontSize="small" />,
    permissions: ['inventory.manage'],
    children: [
      {
        key: 'inventory-dashboard',
        label: 'Dashboard',
        icon: <DashboardIcon fontSize="small" />,
        path: '/inventory/dashboard',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-pricing',
        label: 'Product Pricing',
        path: '/inventory/pricing',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-batches',
        label: 'Batches',
        path: '/inventory/batches',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-transactions',
        label: 'Stock Transactions',
        path: '/inventory/transactions',
        permissions: ['inventory.manage']
      }
    ]
  },
  {
    key: 'purchasing',
    label: 'Purchasing',
    icon: <LocalShippingIcon fontSize="small" />,
    permissions: ['purchasing.manage'],
    children: [
      {
        key: 'purchasing-orders',
        label: 'Purchase Orders',
        path: '/purchasing/orders',
        permissions: ['purchasing.manage']
      },
      {
        key: 'purchasing-create',
        label: 'Create PO',
        path: '/purchasing/order-form',
        permissions: ['purchasing.manage']
      }
    ]
  },
  {
    key: 'settings-group',
    label: 'Settings',
    icon: <SettingsIcon fontSize="small" />,
    permissions: ['settings.view'],
    children: [
      {
        key: 'master',
        label: 'Master Data',
        permissions: ['settings.view'],
        children: [
          {
            key: 'master-store',
            label: 'Stores',
            path: '/master-store',
            permissions: ['master.store.manage']
          },
          {
            key: 'master-user',
            label: 'Master User',
            path: '/master-user',
            permissions: ['master.user.manage']
          },
          {
            key: 'master-product',
            label: 'Products',
            path: '/master-product',
            permissions: ['master.product.manage']
          },
          {
            key: 'master-category',
            label: 'Categories',
            path: '/master-category',
            permissions: ['master.category.manage']
          },
          {
            key: 'master-supplier',
            label: 'Suppliers',
            path: '/master-supplier',
            permissions: ['master.supplier.manage']
          },
          {
            key: 'master-customer',
            label: 'Customers',
            path: '/master-customer',
            permissions: ['master.customer.manage']
          },
          {
            key: 'master-customer-category',
            label: 'Customer Categories',
            path: '/master-customer-category',
            permissions: ['master.customer-category.manage']
          }
        ]
      },
      {
        key: 'access-control',
        label: 'Roles & Permissions',
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
          <ListItemText slotProps={{ primary: { fontSize: 'small' } }} primary={item.label} />
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
            <ListItemText slotProps={{ primary: { fontSize: 'small' } }} primary={item.label} />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>

          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding dense>
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
          <ListItemText slotProps={{ primary: { fontSize: 'small' } }} primary={item.label} />
        </ListItemButton>
      )
    }

    return (
      <ListItemButton key={item.key} sx={{ pl: indent }}>
        {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
        <ListItemText slotProps={{ primary: { fontSize: 'small' } }} primary={item.label} />
      </ListItemButton>
    )
  }

  return (
    <List sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {menus.map((item) => renderMenuItem(item))}
    </List>
  )
}
