import { useState, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import SyncIcon from '@mui/icons-material/Sync'
import CloudIcon from '@mui/icons-material/Cloud'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useToast } from '../contexts/ToastContext'

interface SyncStatus {
  isCloudConnected: boolean
  lastSyncTime: string | null
  unsyncedRecordsCount: number
  deviceId: string
}

export default function SyncButton(): React.JSX.Element {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const toast = useToast()

  useEffect(() => {
    void loadStatus()
    const interval = setInterval(() => {
      void loadStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async (): Promise<void> => {
    try {
      const response = await window.api.db.sync.getStatus()

      if (response.success && response.data) {
        setStatus(response.data)
      }
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const handleFullSync = async (): Promise<void> => {
    setSyncing(true)
    handleClose()
    toast.info('Memulai sinkronisasi...', 'Sync')
    try {
      const response = await window.api.db.sync.fullSync()
      if (response.success && response.data) {
        await loadStatus()
        const { pulled, pushed, conflicts } = response.data
        toast.success(
          `Berhasil: ${pulled} ditarik, ${pushed} dikirim${conflicts > 0 ? `, ${conflicts} konflik` : ''}`,
          'Sinkronisasi Selesai'
        )
      } else {
        toast.error(response.error || 'Sinkronisasi gagal', 'Error')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan', 'Sync Error')
    } finally {
      setSyncing(false)
    }
  }

  const handlePull = async (): Promise<void> => {
    setSyncing(true)
    handleClose()
    toast.info('Menarik data dari cloud...', 'Pull')
    try {
      const response = await window.api.db.sync.pull()
      if (response.success && response.data) {
        await loadStatus()
        toast.success(`${response.data.pulled} data berhasil ditarik`, 'Pull Selesai')
      } else {
        toast.error(response.error || 'Pull gagal', 'Error')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan', 'Pull Error')
    } finally {
      setSyncing(false)
    }
  }

  const handlePush = async (): Promise<void> => {
    setSyncing(true)
    handleClose()
    toast.info('Mengirim data ke cloud...', 'Push')
    try {
      const response = await window.api.db.sync.push()
      if (response.success && response.data) {
        await loadStatus()
        toast.success(`${response.data.pushed} data berhasil dikirim`, 'Push Selesai')
      } else {
        toast.error(response.error || 'Push gagal', 'Error')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan', 'Push Error')
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (time: string | null): string => {
    if (!time) return 'Belum pernah sync'
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isConnected = status?.isCloudConnected ?? false
  const unsyncedCount = status?.unsyncedRecordsCount ?? 0

  return (
    <>
      <Tooltip title={isConnected ? 'Cloud Sync' : 'Offline'}>
        <IconButton color="inherit" onClick={handleClick} disabled={syncing}>
          {syncing ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <Badge badgeContent={unsyncedCount > 0 ? unsyncedCount : null} color="warning" max={99}>
              {isConnected ? <CloudIcon /> : <CloudOffIcon />}
            </Badge>
          )}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 280 } }
        }}
      >
        {/* Status Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {isConnected ? (
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
            ) : (
              <CloudOffIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
            )}
            <Typography variant="subtitle2">
              {isConnected ? 'Terhubung ke Cloud' : 'Mode Offline'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatLastSync(status?.lastSyncTime ?? null)}
          </Typography>
          {unsyncedCount > 0 && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
              {unsyncedCount} data belum tersinkron
            </Typography>
          )}
        </Box>

        <Divider />

        {isConnected ? (
          [
            <MenuItem key="full-sync" onClick={handleFullSync} disabled={syncing}>
              <ListItemIcon>
                <SyncIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sinkronisasi Penuh" secondary="Pull & Push semua data" />
            </MenuItem>,
            <MenuItem key="pull" onClick={handlePull} disabled={syncing}>
              <ListItemIcon>
                <CloudDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Tarik dari Cloud" secondary="Download data terbaru" />
            </MenuItem>,
            <MenuItem key="push" onClick={handlePush} disabled={syncing}>
              <ListItemIcon>
                <CloudUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Kirim ke Cloud" secondary="Upload perubahan lokal" />
            </MenuItem>
          ]
        ) : (
          <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Tidak terhubung ke cloud.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Data disimpan secara lokal.
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  )
}
