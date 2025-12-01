import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import PersonIcon from '@mui/icons-material/Person'
import SideNav from '../components/SideNav'
import SyncButton from '../components/SyncButton'
import useThemeMode from '../hooks/useThemeMode'
import useAuth from '../hooks/useAuth'
import { Paper } from '@mui/material'

const drawerWidth = 200

function formatDateTime(date: Date): { date: string; time: string; day: string } {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const day = days[date.getDay()]
  const dateStr = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return { date: dateStr, time: timeStr, day }
}

export default function MainLayout(): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const { mode, toggleTheme } = useThemeMode()
  const { userName, userRole } = useAuth()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const { date, time, day } = formatDateTime(currentTime)

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <SideNav />
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          {/* User info on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<PersonIcon />}
              label={`${userName || 'User'} • ${userRole || 'Guest'}`}
              size="small"
              color="default"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'inherit',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Petshop Management
          </Typography>
          {/* Date/time on the right */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {day}, {date} • {time}
            </Typography>
          </Box>
          <SyncButton />
          <IconButton color="inherit" onClick={toggleTheme} aria-label="Toggle theme">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Toolbar />
        <Paper elevation={6} square sx={{ p: 4, width: '100%', borderRadius: 2, height: '100%' }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  )
}
