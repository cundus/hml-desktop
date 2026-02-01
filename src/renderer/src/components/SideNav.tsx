import { ExpandLess, ExpandMore } from '@mui/icons-material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import HomeIcon from '@mui/icons-material/Home'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import LogoutIcon from '@mui/icons-material/Logout'
import ReceiptIcon from '@mui/icons-material/Receipt'
import SettingsIcon from '@mui/icons-material/Settings'
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'
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
        permissions: ['sales.pos']
      },
      {
        key: 'sales-reports',
        label: 'Laporan Penjualan',
        path: '/sales/reports',
        permissions: ['sales.reports']
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
        key: 'inventory-management',
        label: 'Inventory Management',
        path: '/inventory',
        permissions: ['inventory.manage']
      },
      {
        key: 'inventory-adjustments',
        label: 'Penyesuaian Stok Massal',
        path: '/inventory/adjustments',
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
    key: 'operations',
    label: 'Operasional',
    icon: <ReceiptIcon fontSize="small" />,
    permissions: ['operations.expenses', 'operations.shift_history'],
    children: [
      {
        key: 'operations-expenses',
        label: 'Pengeluaran Harian',
        path: '/operations/expenses',
        permissions: ['operations.expenses']
      },
      {
        key: 'operations-shifts',
        label: 'Riwayat Shift',
        path: '/operations/shifts',
        permissions: ['operations.shift_history']
      }
    ]
  },
  {
    key: 'product-management',
    label: 'Manajemen Produk',
    icon: <LocalOfferIcon fontSize="small" />,
    permissions: ['master.product.manage', 'pricing.manage'],
    children: [
      {
        key: 'product-dashboard',
        label: 'Dashboard Produk',
        path: '/products',
        permissions: ['master.product.manage']
      },
      // {
      //   key: 'pricing-products',
      //   label: 'Harga Produk',
      //   path: '/pricing/products',
      //   permissions: ['pricing.products']
      // },
      {
        key: 'pricing-categories',
        label: 'Kategori Harga',
        path: '/pricing/categories',
        permissions: ['pricing.categories']
      }
    ]
  },
  {
    key: 'finance',
    label: 'Keuangan',
    icon: <AccountBalanceIcon fontSize="small" />,
    permissions: ['finance.view'],
    children: [
      {
        key: 'finance-cashflow',
        label: 'Arus Kas',
        path: '/finance/cashflow',
        permissions: ['finance.cashflow']
      },
      {
        key: 'finance-reports',
        label: 'Laporan Keuangan',
        path: '/finance/reports',
        permissions: ['finance.reports']
      },
      {
        key: 'finance-profit-loss',
        label: 'Laporan Laba Rugi',
        path: '/finance/profit-loss',
        permissions: ['finance.profit-loss']
      }
    ]
  },
  {
    key: 'settings-group',
    label: 'Menu Pengaturan',
    icon: <SettingsIcon fontSize="small" />,
    permissions: ['settings.view'],
    children: [
      {
        key: 'settings',
        label: 'Pengaturan',
        path: '/settings',
        permissions: ['settings.view']
      },
      {
        key: 'master',
        label: 'Data Master',
        permissions: ['settings.view'],
        children: [
          {
            key: 'master-store',
            label: 'Toko / Cabang',
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
            key: 'master-category',
            label: 'Kategori Produk',
            path: '/master-category',
            permissions: ['master.category.manage']
          },
          {
            key: 'master-supplier',
            label: 'Supplier',
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
          },
          {
            key: 'master-uom',
            label: 'Satuan (UOM)',
            path: '/master-uom',
            permissions: ['master.uom.manage']
          },
          {
            key: 'master-payment-method',
            label: 'Metode Pembayaran',
            path: '/master-payment-method',
            permissions: ['settings.view']
          },
          {
            key: 'master-sales-person',
            label: 'Sales Person',
            path: '/master-sales-person',
            permissions: ['settings.view']
          }
        ]
      },
      {
        key: 'access-control',
        label: 'Peran & Izin',
        path: '/access-control',
        permissions: ['settings.access-control.manage']
      },

      {
        key: 'printer',
        label: 'Pengaturan Printer',
        path: '/settings/printer',
        permissions: ['settings.printer.manage']
      },
      {
        key: 'points',
        label: 'Member Points',
        path: '/settings/points',
        permissions: ['settings.points.manage']
      },
      {
        key: 'audit-logs',
        label: 'Audit Log',
        path: '/settings/audit-logs',
        permissions: ['audit.view']
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

