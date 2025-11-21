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
    label: 'Beranda',
    icon: <HomeIcon fontSize="small" />,
    path: '/',
    permissions: ['dashboard.view']
  },
  {
    key: 'sales',
    label: 'Penjualan',
    icon: <ShoppingBasketIcon fontSize="small" />,
    permissions: ['sales.view'],
    children: [
      {
        key: 'sales-pos',
        label: 'Kasir',
        path: '/sales/pos',
        permissions: ['sales.manage']
      },
      {
        key: 'sales-reports',
        label: 'Laporan Penjualan',
        path: '/sales/reports',
        permissions: ['sales.view']
      }
    ]
  },
  {
    key: 'warehouse',
    label: 'Gudang',
    icon: <StoreIcon fontSize="small" />,
    permissions: ['warehouse.manage'],
    children: [
      {
        key: 'warehouse-stocks',
        label: 'Stok',
        path: '/warehouse/stocks',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-purchasing',
        label: 'Pembelian',
        path: '/warehouse/purchasing',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-stock-opname',
        label: 'Stok Opname',
        path: '/warehouse/stock-opname',
        permissions: ['warehouse.manage']
      },
      {
        key: 'warehouse-pricing',
        label: 'Harga',
        path: '/warehouse/pricing',
        permissions: ['warehouse.manage']
      }
    ]
  },
  {
    key: 'inventory',
    label: 'Inventori',
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
        label: 'Harga Produk',
        path: '/inventory/pricing',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-batches',
        label: 'Batch',
        path: '/inventory/batches',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-transactions',
        label: 'Transaksi Stok',
        path: '/inventory/transactions',
        permissions: ['inventory.manage']
      }
    ]
  },
  {
    key: 'purchasing',
    label: 'Pembelian',
    icon: <LocalShippingIcon fontSize="small" />,
    permissions: ['purchasing.manage'],
    children: [
      {
        key: 'purchasing-orders',
        label: 'Pesanan Pembelian',
        path: '/purchasing/orders',
        permissions: ['purchasing.manage']
      },
      {
        key: 'purchasing-create',
        label: 'Buat PO',
        path: '/purchasing/order-form',
        permissions: ['purchasing.manage']
      }
    ]
  },
  {
    key: 'settings-group',
    label: 'Pengaturan',
    icon: <SettingsIcon fontSize="small" />,
    permissions: ['settings.view'],
    children: [
      {
        key: 'master',
        label: 'Data Master',
        permissions: ['settings.view'],
        children: [
          {
            key: 'master-branch',
            label: 'Master Cabang',
            path: '/master-branch',
            permissions: ['master.branch.manage']
          },
          {
            key: 'master-store',
            label: 'Toko',
            path: '/master-store',
            permissions: ['master.store.manage']
          },
          {
            key: 'master-user',
            label: 'Master Pengguna',
            path: '/master-user',
            permissions: ['master.user.manage']
          },
          {
            key: 'master-product',
            label: 'Produk',
            path: '/master-product',
            permissions: ['master.product.manage']
          },
          {
            key: 'master-category',
            label: 'Kategori',
            path: '/master-category',
            permissions: ['master.category.manage']
          },
          {
            key: 'master-supplier',
            label: 'Pemasok',
            path: '/master-supplier',
            permissions: ['master.supplier.manage']
          },
          {
            key: 'master-customer',
            label: 'Pelanggan',
            path: '/master-customer',
            permissions: ['master.customer.manage']
          },
          {
            key: 'master-customer-category',
            label: 'Kategori Pelanggan',
            path: '/master-customer-category',
            permissions: ['master.customer-category.manage']
          }
        ]
      },
      {
        key: 'access-control',
        label: 'Peran & Izin',
        path: '/access-control',
        permissions: ['settings.access-control.manage']
      }
    ]
  },
  { key: 'logout', label: 'Keluar', icon: <LogoutIcon />, isLogout: true }
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
